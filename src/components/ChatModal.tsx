import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Image, MessageSquare, User } from 'lucide-react';
import { ChatRoom, ChatMessage } from '../types';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRooms: ChatRoom[];
  userRole: 'master_admin' | 'sub_admin';
  currentUserId: string;
  currentUserName: string;
}

export function ChatModal({ 
  isOpen, 
  onClose, 
  chatRooms, 
  userRole, 
  currentUserId,
  currentUserName 
}: ChatModalProps) {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock messages for demonstration
  const mockMessages: { [roomId: string]: ChatMessage[] } = {
    '1': [
      {
        id: '1',
        senderId: 'master_admin',
        senderName: 'Master Admin',
        senderRole: 'master_admin',
        receiverId: '1',
        message: 'Hi John, how is the Q4 sales report coming along?',
        timestamp: new Date('2025-09-04T09:00:00'),
        isRead: true
      },
      {
        id: '2',
        senderId: '1',
        senderName: 'John Sales',
        senderRole: 'sub_admin',
        receiverId: 'master_admin',
        message: 'Good morning! I\'m about 70% done with the report. Should have it ready by tomorrow.',
        timestamp: new Date('2025-09-04T09:15:00'),
        isRead: true
      },
      {
        id: '3',
        senderId: 'master_admin',
        senderName: 'Master Admin',
        senderRole: 'master_admin',
        receiverId: '1',
        message: 'Perfect! Let me know if you need any additional data or support.',
        timestamp: new Date('2025-09-04T09:20:00'),
        isRead: false
      }
    ],
    '2': [
      {
        id: '4',
        senderId: '2',
        senderName: 'Sarah PR',
        senderRole: 'sub_admin',
        receiverId: 'master_admin',
        message: 'The social media campaign mockups are ready for review.',
        timestamp: new Date('2025-09-03T15:20:00'),
        isRead: true
      }
    ]
  };

  useEffect(() => {
    if (selectedRoom) {
      setMessages(mockMessages[selectedRoom.id] || []);
    }
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !imageFile) return;
    if (!selectedRoom) return;

    const messageData = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: userRole,
      receiverId: userRole === 'master_admin' ? selectedRoom.subAdminId : 'master_admin',
      message: newMessage,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      timestamp: new Date(),
      isRead: false
    };

    setMessages(prev => [...prev, messageData]);
    setNewMessage('');
    setImageFile(null);
    
    toast.success('Message sent!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm');
    } else if (isYesterday(timestamp)) {
      return `Yesterday ${format(timestamp, 'HH:mm')}`;
    } else {
      return format(timestamp, 'MMM dd, HH:mm');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col lg:flex-row">
        {/* Chat Rooms Sidebar */}
        <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 h-1/3 lg:h-full">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
              Chats
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="overflow-y-auto h-full">
            {chatRooms.length > 0 ? (
              chatRooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200 ${
                    selectedRoom?.id === room.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {room.subAdminName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {room.department}
                        </p>
                      </div>
                    </div>
                    {room.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {format(room.updatedAt, 'MMM dd, HH:mm')}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500 dark:text-gray-400">No chat rooms available</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col h-2/3 lg:h-full">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRoom.subAdminName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {selectedRoom.department} Department
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => {
                  const isOwn = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwn 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}>
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1 opacity-75">
                            {message.senderName}
                          </p>
                        )}
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt="Shared image"
                            className="w-full rounded mb-2 max-w-sm"
                          />
                        )}
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                {imageFile && (
                  <div className="mb-2 flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                    <div className="flex items-center">
                      <Image className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {imageFile.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setImageFile(null)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && !imageFile}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Select a conversation
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a chat room to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
