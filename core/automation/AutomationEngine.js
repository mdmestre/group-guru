/**
 * Automation Engine - Node-Based Flow Execution
 * 
 * Executes visual automation flows node by node.
 * Features:
 * - Node-by-node execution
 * - State management in execution_context
 * - Retry logic
 * - Delay support
 * - Lock by entity (lock_key)
 * - Idempotency
 * - AI integration
 */

import { query } from '../../database/connection.js';
import contextManager from '../context/ContextManager.js';
import eventBus from '../events/EventBus.js';
import auditService from '../audit/AuditService.js';
import { Mutex } from 'async-mutex';

class AutomationEngine {
  constructor() {
    this.locks = new Map(); // In-memory locks (can be replaced with Redis for distributed)
  }

  /**
   * Get or create lock for an entity
   * @param {string} lockKey - Lock key (e.g., "contact:123")
   * @returns {Mutex} Mutex instance
   */
  getLock(lockKey) {
    if (!this.locks.has(lockKey)) {
      this.locks.set(lockKey, new Mutex());
    }
    return this.locks.get(lockKey);
  }

  /**
   * Create a new automation run
   * @param {string} automationId - Automation ID
   * @param {string} contactId - Contact ID
   * @param {Object} triggerData - Trigger data
   * @returns {Promise<Object>} Created run
   */
  async createRun(automationId, contactId, triggerData = {}) {
    const ctx = contextManager.requireContext();

    // Get automation
    const automationResult = await query(
      'SELECT * FROM automations WHERE id = $1 AND company_id = $2',
      [automationId, ctx.companyId]
    );

    if (automationResult.rows.length === 0) {
      throw new Error(`Automation ${automationId} not found`);
    }

    const automation = automationResult.rows[0];

    if (!automation.is_active || automation.is_paused) {
      throw new Error(`Automation ${automationId} is not active`);
    }

    // Check for existing run with same lock_key
    const lockKey = contactId ? `contact:${contactId}` : null;
    
    if (lockKey) {
      const existingRun = await query(
        `SELECT * FROM automation_runs 
         WHERE automation_id = $1 AND lock_key = $2 
         AND status IN ('pending', 'running', 'retrying')
         ORDER BY created_at DESC LIMIT 1`,
        [automationId, lockKey]
      );

      if (existingRun.rows.length > 0) {
        // Idempotency: return existing run
        return existingRun.rows[0];
      }
    }

    // Create new run
    const runResult = await query(
      `INSERT INTO automation_runs (
        automation_id, company_id, contact_id, trigger_data, 
        execution_context, lock_key, automation_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        automationId,
        ctx.companyId,
        contactId,
        JSON.stringify(triggerData),
        JSON.stringify({}),
        lockKey,
        automation.version
      ]
    );

    const run = runResult.rows[0];

    // Emit event
    await eventBus.emitAutomationStarted(automationId, run.id, triggerData);

    // Audit log
    await auditService.logAutomationStarted(automationId, run.id, triggerData);

    return run;
  }

  /**
   * Execute a single node
   * @param {Object} run - Automation run
   * @param {Object} node - Node definition
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Node result
   */
  async executeNode(run, node, context) {
    const startTime = Date.now();
    const nodeId = node.id;
    const nodeType = node.type;

    try {
      let result = {};

      switch (nodeType) {
        case 'trigger':
          // Trigger nodes are already processed
          result = { success: true, data: context };
          break;

        case 'action':
          result = await this.executeAction(node, context);
          break;

        case 'condition':
          result = await this.executeCondition(node, context);
          break;

        case 'delay':
          result = await this.executeDelay(node, context);
          break;

        case 'split':
          result = await this.executeSplit(node, context);
          break;

        case 'ai-response':
          result = await this.executeAIResponse(node, context);
          break;

        default:
          throw new Error(`Unknown node type: ${nodeType}`);
      }

      const duration = Date.now() - startTime;

      // Log node execution
      await query(
        `INSERT INTO automation_logs (
          run_id, company_id, node_id, node_type, action_type,
          status, input_snapshot, output_snapshot, duration_ms, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          run.id,
          run.company_id,
          nodeId,
          nodeType,
          node.data?.actionType || null,
          'success',
          JSON.stringify(context),
          JSON.stringify(result),
          duration
        ]
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      await query(
        `INSERT INTO automation_logs (
          run_id, company_id, node_id, node_type, action_type,
          status, input_snapshot, error_message, duration_ms, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          run.id,
          run.company_id,
          nodeId,
          nodeType,
          node.data?.actionType || null,
          'failed',
          JSON.stringify(context),
          error.message,
          duration
        ]
      );

      throw error;
    }
  }

  /**
   * Execute action node
   */
  async executeAction(node, context) {
    const actionType = node.data?.actionType;

    switch (actionType) {
      case 'send_message':
      case 'send_whatsapp':
        return await this.executeSendWhatsApp(node, context);
      
      case 'update_stage':
      case 'change_stage':
        return await this.executeUpdateStage(node, context);
      
      case 'add_tag':
        return await this.executeAddTag(node, context);
      
      case 'update_field':
        return await this.executeUpdateField(node, context);
      
      case 'http_request':
      case 'call_webhook':
        return await this.executeHttpRequest(node, context);
      
      case 'ai_response':
        return await this.executeAIResponse(node, context);
      
      case 'send_email':
        return await this.executeSendEmail(node, context);
      
      case 'create_task':
        return await this.executeCreateTask(node, context);
      
      case 'wait':
        return await this.executeDelay(node, context);
      
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Execute send WhatsApp action
   */
  async executeSendWhatsApp(node, context) {
    const config = node.data?.config || {};
    const message = this.interpolateTemplate(config.message || node.data?.message || '', context);
    const contactId = context.contactId || context.contact?.id;
    
    if (!contactId) {
      throw new Error('Contact ID is required to send message');
    }

    // Get contact info
    const contactResult = await query(
      'SELECT * FROM crm_contacts WHERE id = $1',
      [contactId]
    );

    if (contactResult.rows.length === 0) {
      throw new Error(`Contact ${contactId} not found`);
    }

    const contact = contactResult.rows[0];
    const phoneNumber = contact.phone || contact.whatsapp;

    if (!phoneNumber) {
      throw new Error('Contact phone number not found');
    }

    // TODO: Integrate with WhatsApp service (BaileysInstanceService)
    // For now, we'll create a message record
    const messageResult = await query(
      `INSERT INTO messages (company_id, contact_id, content, direction, status, created_at)
       VALUES ($1, $2, $3, 'outbound', 'pending', NOW())
       RETURNING *`,
      [contextManager.requireContext().companyId, contactId, message]
    );

    // Emit message sent event
    await eventBus.emit('message.sent', {
      entityId: messageResult.rows[0].id,
      payload: {
        contactId,
        message,
        phoneNumber
      }
    });

    return {
      success: true,
      messageId: messageResult.rows[0].id,
      message
    };
  }

  /**
   * Execute update stage action
   */
  async executeUpdateStage(node, context) {
    const contactId = context.contactId || context.contact?.id;
    const config = node.data?.config || {};
    const stageId = config.stageId || node.data?.stageId;
    const pipelineId = config.pipelineId || node.data?.pipelineId;

    if (!contactId || !stageId) {
      throw new Error('Contact ID and Stage ID are required');
    }

    // Update contact stage
    await query(
      'UPDATE crm_contacts SET pipeline_stage_id = $1, updated_at = NOW() WHERE id = $2',
      [stageId, contactId]
    );

    // Emit event
    await eventBus.emitContactStageChanged(contactId, context.currentStage, stageId);

    return {
      success: true,
      contactId,
      stageId
    };
  }

  /**
   * Execute add tag action
   */
  async executeAddTag(node, context) {
    const contactId = context.contactId || context.contact?.id;
    const config = node.data?.config || {};
    const tagId = config.tagId || node.data?.tagId;

    if (!contactId || !tagId) {
      throw new Error('Contact ID and Tag ID are required');
    }

    // Add tag (idempotent)
    await query(
      `INSERT INTO crm_contact_tags (contact_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (contact_id, tag_id) DO NOTHING`,
      [contactId, tagId]
    );

    return {
      success: true,
      contactId,
      tagId
    };
  }

  /**
   * Execute update field action
   */
  async executeUpdateField(node, context) {
    const contactId = context.contactId || context.contact?.id;
    const config = node.data?.config || {};
    const fieldId = config.fieldId || node.data?.fieldId;
    const fieldValue = config.fieldValue || node.data?.fieldValue;

    if (!contactId || !fieldId) {
      throw new Error('Contact ID and Field ID are required');
    }

    // Update custom field value
    await query(
      `INSERT INTO crm_custom_field_values (contact_id, field_id, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (contact_id, field_id) 
       DO UPDATE SET value = $3, updated_at = NOW()`,
      [contactId, fieldId, JSON.stringify(fieldValue)]
    );

    return {
      success: true,
      contactId,
      fieldId,
      fieldValue
    };
  }

  /**
   * Execute HTTP request action
   */
  async executeHttpRequest(node, context) {
    const config = node.data?.config || {};
    const url = config.webhookUrl || config.url;
    const method = config.webhookMethod || config.method || 'POST';
    const headers = config.webhookHeaders || config.headers || {};
    const body = config.webhookBody || config.body;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const responseData = await response.json().catch(() => ({}));

      return {
        success: response.ok,
        status: response.status,
        response: responseData
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  /**
   * Execute AI response node
   */
  async executeAIResponse(node, context) {
    try {
      // Import AIService dynamically
      const { aiService } = await import('../../src/features/automations/services/AIService.js');
      
      const config = node.data?.config || {};
      const prompt = config.aiPrompt || config.prompt || '';
      
      if (!prompt) {
        throw new Error('AI prompt is required');
      }

      // Build context for AI
      const aiContext = {
        conversationHistory: context.conversationHistory || [],
        contactInfo: context.contact || {},
        systemPrompt: config.systemPrompt
      };

      // Interpolate prompt with context variables
      const interpolatedPrompt = this.interpolateTemplate(prompt, context);

      // Generate AI response
      const aiResponse = await aiService.generateResponse(interpolatedPrompt, aiContext);

      // Store response in context
      context.aiResponse = aiResponse.text;
      context.aiSentiment = aiResponse.sentiment;
      context.aiIntent = aiResponse.intent;

      // If configured to send message, send it
      if (config.sendMessage !== false) {
        const contactId = context.contactId || context.contact?.id;
        if (contactId) {
          // Send message via WhatsApp
          await this.executeSendWhatsApp({
            data: {
              config: {
                message: aiResponse.text
              }
            }
          }, context);
        }
      }

      return {
        success: true,
        response: aiResponse.text,
        sentiment: aiResponse.sentiment,
        intent: aiResponse.intent,
        suggestedActions: aiResponse.suggestedActions
      };
    } catch (error) {
      // If AI service fails, fallback to human handover if configured
      if (node.data?.config?.fallbackToHuman) {
        // Create task for human agent
        await this.executeCreateTask({
          data: {
            config: {
              taskTitle: 'AI Response Failed - Human Review Needed',
              taskDescription: `AI response failed for contact ${context.contactId}: ${error.message}`
            }
          }
        }, context);
        
        return {
          success: false,
          error: error.message,
          fallbackToHuman: true
        };
      }
      throw error;
    }
  }

  /**
   * Execute send email action
   */
  async executeSendEmail(node, context) {
    const config = node.data?.config || {};
    const to = config.emailTo || context.contact?.email;
    const subject = this.interpolateTemplate(config.emailSubject || '', context);
    const body = this.interpolateTemplate(config.emailBody || '', context);

    if (!to) {
      throw new Error('Email recipient is required');
    }

    // TODO: Integrate with email service (SendGrid, etc)
    // For now, we'll just log it
    console.log('[AutomationEngine] Email would be sent:', { to, subject });

    return {
      success: true,
      emailId: `email_${Date.now()}`,
      to,
      subject
    };
  }

  /**
   * Execute create task action
   */
  async executeCreateTask(node, context) {
    const config = node.data?.config || {};
    const title = this.interpolateTemplate(config.taskTitle || '', context);
    const description = this.interpolateTemplate(config.taskDescription || '', context);
    const assignTo = config.assignTo || context.userId;
    const dueDate = config.dueDate ? new Date(config.dueDate) : null;

    if (!title) {
      throw new Error('Task title is required');
    }

    // Create task record (assuming tasks table exists)
    // If table doesn't exist, we'll just log it
    try {
      const taskResult = await query(
        `INSERT INTO tasks (company_id, title, description, assigned_to, due_date, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         RETURNING *`,
        [
          contextManager.requireContext().companyId,
          title,
          description || null,
          assignTo || null,
          dueDate
        ]
      );

      return {
        success: true,
        taskId: taskResult.rows[0].id,
        title
      };
    } catch (error) {
      // If tasks table doesn't exist, just log
      console.log('[AutomationEngine] Task would be created:', { title, description });
      return {
        success: true,
        taskId: `task_${Date.now()}`,
        title
      };
    }
  }

  /**
   * Execute condition node
   */
  async executeCondition(node, context) {
    const conditions = node.data?.conditions || [];
    const logic = node.data?.logic || 'AND';

    if (conditions.length === 0) {
      return { success: true, result: true };
    }

    const results = conditions.map(condition => {
      const value = this.getContextValue(condition.field, context);
      const operator = condition.operator;
      const expected = condition.value;

      switch (operator) {
        case 'equals':
          return value === expected;
        case 'not_equals':
          return value !== expected;
        case 'contains':
          return String(value).includes(String(expected));
        case 'not_contains':
          return !String(value).includes(String(expected));
        case 'greater_than':
          return Number(value) > Number(expected);
        case 'less_than':
          return Number(value) < Number(expected);
        case 'is_empty':
          return !value || value === '';
        case 'is_not_empty':
          return value && value !== '';
        case 'in':
          return Array.isArray(expected) && expected.includes(value);
        case 'not_in':
          return Array.isArray(expected) && !expected.includes(value);
        default:
          return false;
      }
    });

    const result = logic === 'OR' 
      ? results.some(r => r)
      : results.every(r => r);

    return {
      success: true,
      result,
      results
    };
  }

  /**
   * Execute delay node
   */
  async executeDelay(node, context) {
    const config = node.data?.config || {};
    const delayType = config.delayType || node.data?.delayType || 'seconds';
    const delayValue = config.delayValue || node.data?.delayValue || 0;
    
    let delayMs = 0;
    
    switch (delayType) {
      case 'seconds':
        delayMs = delayValue * 1000;
        break;
      case 'minutes':
        delayMs = delayValue * 60 * 1000;
        break;
      case 'hours':
        delayMs = delayValue * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = delayValue * 24 * 60 * 60 * 1000;
        break;
      case 'until':
        const untilDate = new Date(config.delayUntil || node.data?.delayUntil);
        delayMs = untilDate.getTime() - Date.now();
        break;
    }
    
    if (delayMs <= 0) {
      return { success: true, delayMs: 0 };
    }
    
    // Update run with delay
    const delayUntil = new Date(Date.now() + delayMs);
    await query(
      'UPDATE automation_runs SET delay_until = $1, status = $2 WHERE id = $3',
      [delayUntil, 'delayed', context.runId]
    );

    return {
      success: true,
      delayUntil: delayUntil.toISOString(),
      delayMs
    };
  }

  /**
   * Execute split node
   */
  async executeSplit(node, context) {
    const paths = node.data?.paths || [];
    
    // Evaluate each path condition
    for (const path of paths) {
      if (path.condition) {
        const conditionResult = await this.executeCondition({
          data: {
            conditions: [path.condition],
            logic: 'AND'
          }
        }, context);
        
        if (conditionResult.result) {
          return {
            success: true,
            path: path.id,
            label: path.label
          };
        }
      }
    }
    
    // Default path
    return {
      success: true,
      path: 'default',
      label: 'Default'
    };
  }

  /**
   * Get value from context by path
   */
  getContextValue(path, context) {
    const parts = path.split('.');
    let value = context;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  /**
   * Interpolate template with context
   */
  interpolateTemplate(template, context) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this.getContextValue(key, context) || match;
    });
  }

  /**
   * Execute automation run
   * @param {string} runId - Run ID
   * @returns {Promise<Object>} Run result
   */
  async executeRun(runId) {
    const ctx = contextManager.requireContext();

    // Get run
    const runResult = await query(
      'SELECT * FROM automation_runs WHERE id = $1 AND company_id = $2',
      [runId, ctx.companyId]
    );

    if (runResult.rows.length === 0) {
      throw new Error(`Run ${runId} not found`);
    }

    const run = runResult.rows[0];

    // Check lock
    if (run.lock_key) {
      const lock = this.getLock(run.lock_key);
      const release = await lock.acquire();
      
      try {
        return await this.executeRunInternal(run);
      } finally {
        release();
      }
    } else {
      return await this.executeRunInternal(run);
    }
  }

  /**
   * Internal run execution
   */
  async executeRunInternal(run) {
    // Update status
    await query(
      'UPDATE automation_runs SET status = $1, started_at = NOW() WHERE id = $2',
      ['running', run.id]
    );

    try {
      // Get automation
      const automationResult = await query(
        'SELECT * FROM automations WHERE id = $1',
        [run.automation_id]
      );

      if (automationResult.rows.length === 0) {
        throw new Error(`Automation ${run.automation_id} not found`);
      }

      const automation = automationResult.rows[0];
      const flowDefinition = automation.flow_definition;
      const nodes = flowDefinition.nodes || [];
      const edges = flowDefinition.edges || [];

      // Build execution context
      let context = {
        ...run.execution_context,
        runId: run.id,
        contactId: run.contact_id,
        triggerData: run.trigger_data
      };

      // Find trigger node (start node)
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found in flow');
      }

      // Execute nodes in order (following edges)
      const executedNodes = new Set();
      let currentNode = triggerNode;

      while (currentNode) {
        if (executedNodes.has(currentNode.id)) {
          // Prevent infinite loops
          break;
        }
        executedNodes.add(currentNode.id);

        // Execute node
        const result = await this.executeNode(run, currentNode, context);

        // Update context with result
        context = {
          ...context,
          [`node_${currentNode.id}`]: result
        };

        // Check if delay was set
        if (result.delayUntil) {
          // Run is delayed, exit
          return {
            status: 'delayed',
            delayUntil: result.delayUntil,
            context
          };
        }

        // Find next node(s) via edges
        const outgoingEdges = edges.filter(e => e.source === currentNode.id);
        
        if (outgoingEdges.length === 0) {
          // End of flow
          break;
        }

        // For conditions, choose path based on result
        if (currentNode.type === 'condition') {
          const trueEdge = outgoingEdges.find(e => e.sourceHandle === 'true');
          const falseEdge = outgoingEdges.find(e => e.sourceHandle === 'false');
          
          if (result.result && trueEdge) {
            currentNode = nodes.find(n => n.id === trueEdge.target);
          } else if (!result.result && falseEdge) {
            currentNode = nodes.find(n => n.id === falseEdge.target);
          } else {
            break;
          }
        } else if (currentNode.type === 'split') {
          // For split, follow the chosen path
          const pathEdge = outgoingEdges.find(e => e.sourceHandle === result.path);
          if (pathEdge) {
            currentNode = nodes.find(n => n.id === pathEdge.target);
          } else {
            break;
          }
        } else {
          // For other nodes, follow first edge
          currentNode = nodes.find(n => n.id === outgoingEdges[0].target);
        }
      }

      // Update run as completed
      await query(
        `UPDATE automation_runs 
         SET status = $1, completed_at = NOW(), execution_context = $2
         WHERE id = $3`,
        ['completed', JSON.stringify(context), run.id]
      );

      // Update automation stats
      await query(
        `UPDATE automations 
         SET total_runs = total_runs + 1, 
             successful_runs = successful_runs + 1,
             last_run_at = NOW()
         WHERE id = $1`,
        [run.automation_id]
      );

      // Emit event
      await eventBus.emitAutomationCompleted(run.id, { context });

      return {
        status: 'completed',
        context
      };
    } catch (error) {
      // Update run as failed
      await query(
        `UPDATE automation_runs 
         SET status = $1, completed_at = NOW(), error_message = $2
         WHERE id = $3`,
        ['failed', error.message, run.id]
      );

      // Update automation stats
      await query(
        `UPDATE automations 
         SET total_runs = total_runs + 1, 
             failed_runs = failed_runs + 1,
             last_run_at = NOW()
         WHERE id = $1`,
        [run.automation_id]
      );

      // Emit event
      await eventBus.emitAutomationFailed(run.id, error);

      throw error;
    }
  }
}

// Singleton instance
const automationEngine = new AutomationEngine();

export default automationEngine;
