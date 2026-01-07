/**
 * Telegram Bot Integration Service
 * Phase 4: Multi-channel support
 */

const { Telegraf } = require('telegraf');
const { query } = require('../database');

class TelegramService {
  constructor() {
    this.bots = new Map(); // companyId -> bot instance
  }

  /**
   * Initialize Telegram bot for a company
   */
  async initializeBot(companyId, botToken) {
    try {
      if (this.bots.has(companyId)) {
        await this.disconnectBot(companyId);
      }

      const bot = new Telegraf(botToken);
      
      // Set up message handler
      bot.on('message', async (ctx) => {
        await this.handleInboundMessage(companyId, ctx);
      });

      // Set up callback query handler (buttons)
      bot.on('callback_query', async (ctx) => {
        await this.handleCallbackQuery(companyId, ctx);
      });

      await bot.launch();
      this.bots.set(companyId, bot);

      // Update connection status
      await query(
        `UPDATE channel_connections 
         SET status = 'connected', error_message = NULL, last_activity_at = NOW()
         WHERE company_id = $1 AND channel_type = 'telegram'`,
        [companyId]
      );

      return { success: true, bot };
    } catch (error) {
      console.error(`[TelegramService] Error initializing bot for company ${companyId}:`, error);
      
      await query(
        `UPDATE channel_connections 
         SET status = 'error', error_message = $1, last_error_at = NOW()
         WHERE company_id = $2 AND channel_type = 'telegram'`,
        [error.message, companyId]
      );

      throw error;
    }
  }

  /**
   * Handle inbound Telegram message
   */
  async handleInboundMessage(companyId, ctx) {
    try {
      const message = ctx.message;
      const chat = message.chat;
      
      // Save message to database
      const result = await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          channel_message_id, thread_id,
          from_identifier, to_identifier,
          message_type, content, direction, status,
          metadata, created_at
        ) VALUES (
          $1, 
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'telegram' LIMIT 1),
          'telegram',
          $2, $3,
          $4, $5,
          $6, $7, 'inbound', 'delivered',
          $8, NOW()
        )
        RETURNING id`,
        [
          companyId,
          message.message_id.toString(),
          chat.id.toString(),
          chat.id.toString(), // from
          'bot', // to
          this.getMessageType(message),
          this.getMessageContent(message),
          JSON.stringify({
            chatType: chat.type,
            chatTitle: chat.title,
            username: chat.username,
            firstName: chat.first_name,
            lastName: chat.last_name
          })
        ]
      );

      // Emit event for automations/webhooks
      const { EventBus } = require('../events/EventBus');
      const eventBus = new EventBus();
      await eventBus.emit('message.received', {
        entityId: result.rows[0].id,
        payload: {
          channel: 'telegram',
          messageId: result.rows[0].id,
          from: chat.id.toString(),
          content: this.getMessageContent(message)
        }
      });

      // Update activity timestamp
      await query(
        `UPDATE channel_connections 
         SET last_activity_at = NOW(), message_count = message_count + 1
         WHERE company_id = $1 AND channel_type = 'telegram'`,
        [companyId]
      );
    } catch (error) {
      console.error('[TelegramService] Error handling inbound message:', error);
    }
  }

  /**
   * Handle callback query (button clicks)
   */
  async handleCallbackQuery(companyId, ctx) {
    try {
      await ctx.answerCbQuery();
      
      // Process button click
      const { EventBus } = require('../events/EventBus');
      const eventBus = new EventBus();
      await eventBus.emit('interaction.received', {
        entityId: ctx.chat.id.toString(),
        payload: {
          channel: 'telegram',
          type: 'button_click',
          data: ctx.callbackQuery.data,
          userId: ctx.from.id.toString()
        }
      });
    } catch (error) {
      console.error('[TelegramService] Error handling callback query:', error);
    }
  }

  /**
   * Send message via Telegram
   */
  async sendMessage(companyId, chatId, content, options = {}) {
    try {
      const bot = this.bots.get(companyId);
      if (!bot) {
        throw new Error('Telegram bot not initialized for this company');
      }

      let message;
      if (options.mediaUrl) {
        // Send media
        switch (options.mediaType) {
          case 'image':
            message = await bot.telegram.sendPhoto(chatId, options.mediaUrl, {
              caption: content,
              ...options.telegramOptions
            });
            break;
          case 'video':
            message = await bot.telegram.sendVideo(chatId, options.mediaUrl, {
              caption: content,
              ...options.telegramOptions
            });
            break;
          case 'document':
            message = await bot.telegram.sendDocument(chatId, options.mediaUrl, {
              caption: content,
              ...options.telegramOptions
            });
            break;
          default:
            message = await bot.telegram.sendMessage(chatId, content, options.telegramOptions);
        }
      } else {
        // Send text message
        const messageOptions = {
          parse_mode: options.parseMode || 'HTML',
          ...options.telegramOptions
        };

        // Add inline keyboard if buttons provided
        if (options.buttons && options.buttons.length > 0) {
          messageOptions.reply_markup = {
            inline_keyboard: options.buttons.map(row =>
              row.map(btn => ({
                text: btn.text,
                callback_data: btn.data || btn.text
              }))
            )
          };
        }

        message = await bot.telegram.sendMessage(chatId, content, messageOptions);
      }

      // Save outbound message
      await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          channel_message_id, thread_id,
          from_identifier, to_identifier,
          message_type, content, media_url, media_type,
          direction, status,
          metadata, created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'telegram' LIMIT 1),
          'telegram',
          $2, $3,
          'bot', $4,
          $5, $6, $7, $8,
          'outbound', 'sent',
          $9, NOW()
        )`,
        [
          companyId,
          message.message_id.toString(),
          chatId.toString(),
          chatId.toString(),
          options.mediaUrl ? 'media' : 'text',
          content,
          options.mediaUrl || null,
          options.mediaType || null,
          JSON.stringify({ telegramOptions: options.telegramOptions })
        ]
      );

      // Update stats
      await query(
        `UPDATE channel_connections 
         SET last_activity_at = NOW(), message_count = message_count + 1
         WHERE company_id = $1 AND channel_type = 'telegram'`,
        [companyId]
      );

      return { success: true, messageId: message.message_id };
    } catch (error) {
      console.error('[TelegramService] Error sending message:', error);
      
      // Save failed message
      await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          from_identifier, to_identifier,
          message_type, content, direction, status, error_message,
          created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'telegram' LIMIT 1),
          'telegram',
          'bot', $2,
          'text', $3, 'outbound', 'failed', $4,
          NOW()
        )`,
        [companyId, chatId, content, error.message]
      );

      throw error;
    }
  }

  /**
   * Disconnect bot
   */
  async disconnectBot(companyId) {
    try {
      const bot = this.bots.get(companyId);
      if (bot) {
        await bot.stop();
        this.bots.delete(companyId);
      }

      await query(
        `UPDATE channel_connections 
         SET status = 'disconnected'
         WHERE company_id = $1 AND channel_type = 'telegram'`,
        [companyId]
      );

      return { success: true };
    } catch (error) {
      console.error('[TelegramService] Error disconnecting bot:', error);
      throw error;
    }
  }

  /**
   * Helper: Get message type from Telegram message
   */
  getMessageType(message) {
    if (message.photo) return 'image';
    if (message.video) return 'video';
    if (message.audio) return 'audio';
    if (message.document) return 'document';
    if (message.location) return 'location';
    if (message.contact) return 'contact';
    return 'text';
  }

  /**
   * Helper: Extract content from Telegram message
   */
  getMessageContent(message) {
    if (message.text) return message.text;
    if (message.caption) return message.caption;
    if (message.photo) return '[Photo]';
    if (message.video) return '[Video]';
    if (message.document) return message.document.file_name || '[Document]';
    if (message.audio) return message.audio.title || '[Audio]';
    return '[Unknown message type]';
  }
}

module.exports = TelegramService;

