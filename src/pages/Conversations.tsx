import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Pin
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  side: "in" | "out";
  timestamp: Date;
  status?: "sending" | "sent" | "delivered" | "read";
  type?: "text" | "image" | "document" | "audio" | "video";
}

interface Conversation {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  status: "online" | "offline" | "typing";
  messages: Message[];
  tags?: string[];
  isPinned?: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "João",
    phone: "5511999887766",
    lastMessage: "João está digitando...",
    lastMessageTime: new Date(),
    unreadCount: 12,
    status: "typing",
    isPinned: true,
    messages: [
      {
        id: "m1",
        text: "Olá! Gostaria de saber mais sobre os perfumes",
        side: "in",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: "read",
      },
    ],
  },
  {
    id: "2",
    name: "Marcos",
    phone: "5511988776655",
    lastMessage: "Lorem ipsum dolor sit...",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0,
    status: "offline",
    messages: [],
  },
  {
    id: "3",
    name: "Márcia",
    phone: "5521977665544",
    lastMessage: "Imagem",
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unreadCount: 55,
    status: "offline",
    messages: [],
  },
  {
    id: "4",
    name: "Maria",
    phone: "5531966554433",
    lastMessage: "Documento",
    lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    unreadCount: 6,
    status: "offline",
    messages: [],
  },
  {
    id: "5",
    name: "Ana",
    phone: "5541955443322",
    lastMessage: "Olá! Como posso ajudar?",
    lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    unreadCount: 12,
    status: "offline",
    messages: [],
  },
  {
    id: "6",
    name: "Jason",
    phone: "5551944332211",
    lastMessage: "Perfeito! Vou fazer o pedido",
    lastMessageTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    unreadCount: 25,
    status: "offline",
    messages: [],
  },
];

function formatTime(date?: Date): string {
  if (!date) return "";
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  if (isYesterday(date)) {
    return "Ontem";
  }
  return format(date, "dd/MM/yyyy");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Conversations() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "pending">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.phone.includes(searchTerm);
    
    if (activeFilter === "unread") {
      return matchesSearch && conv.unreadCount > 0;
    }
    if (activeFilter === "pending") {
      return matchesSearch && conv.status === "typing";
    }
    return matchesSearch;
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    setMessageInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {/* Conversations List - Left Panel */}
      <div className="w-[400px] flex flex-col border-r border-neutral-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Mensagens</h2>
            <Button
              size="icon"
              className="h-9 w-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Buscar"
              className={cn(
                "pl-9 h-10 bg-white border-neutral-200",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "transition-all duration-200"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3 bg-neutral-100">
              <TabsTrigger
                value="all"
                className={cn(
                  "data-[state=active]:bg-white data-[state=active]:text-primary-600",
                  "data-[state=active]:shadow-sm"
                )}
              >
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className={cn(
                  "data-[state=active]:bg-white data-[state=active]:text-primary-600",
                  "data-[state=active]:shadow-sm"
                )}
              >
                Não Lidas
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className={cn(
                  "data-[state=active]:bg-white data-[state=active]:text-primary-600",
                  "data-[state=active]:shadow-sm"
                )}
              >
                Aguardando
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div>
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversation?.id === conversation.id;
              const initials = getInitials(conversation.name);

              return (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-neutral-100",
                    isSelected
                      ? "bg-primary-50"
                      : "hover:bg-neutral-50"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary-100 text-primary-600 font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.status === "online" && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-neutral-900 truncate">
                          {conversation.name}
                        </h3>
                        {conversation.isPinned && (
                          <Pin className="h-3 w-3 text-neutral-400" />
                        )}
                      </div>
                      {conversation.lastMessageTime && (
                        <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-neutral-600 truncate">
                        {conversation.lastMessage || "Nenhuma mensagem"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="h-5 min-w-[20px] bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area - Right Panel */}
      <div className="flex-1 flex flex-col bg-neutral-50">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary-100 text-primary-600 font-semibold">
                    {getInitials(selectedConversation.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-base text-neutral-900">
                    {selectedConversation.name}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {selectedConversation.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Phone className="h-5 w-5 text-neutral-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Video className="h-5 w-5 text-neutral-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5 text-neutral-600" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-3">
                {selectedConversation.messages.map((message) => {
                  const isOutgoing = message.side === "out";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        isOutgoing ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5",
                          isOutgoing
                            ? "bg-primary-600 text-white rounded-br-sm"
                            : "bg-white text-neutral-900 rounded-bl-sm border border-neutral-200"
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-1.5 justify-end",
                            isOutgoing ? "text-white/70" : "text-neutral-500"
                          )}
                        >
                          <span className="text-xs">
                            {format(message.timestamp, "HH:mm")}
                          </span>
                          {isOutgoing && (
                            <>
                              {message.status === "read" ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : message.status === "delivered" ? (
                                <CheckCheck className="h-3.5 w-3.5 opacity-70" />
                              ) : message.status === "sent" ? (
                                <Check className="h-3.5 w-3.5 opacity-70" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 opacity-50 animate-pulse" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-white">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Paperclip className="h-5 w-5 text-neutral-600" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Digite uma mensagem"
                    className={cn(
                      "pr-11 h-12 bg-white border-neutral-200 rounded-2xl",
                      "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                      "transition-all duration-200"
                    )}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                  >
                    <Smile className="h-5 w-5 text-neutral-400" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className={cn(
                    "h-12 px-6 bg-primary-600 hover:bg-primary-700 text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-neutral-50">
            <div className="text-center max-w-md">
              <div className="h-20 w-20 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-10 w-10 text-neutral-400" />
              </div>
              <div className="bg-white rounded-2xl px-6 py-4 mb-6 inline-block">
                <p className="text-neutral-600 font-medium">Bem Vindo, Jorge!</p>
              </div>
              <p className="text-neutral-600 mb-6">Escolha alguém para começar a conversar!</p>
              <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                <MessageSquare className="h-4 w-4 mr-2" />
                Convidar Pessoas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
