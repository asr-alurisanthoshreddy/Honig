import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageCircle, 
  Mail, 
  Check, 
  AlertCircle, 
  Settings, 
  Phone,
  User,
  Shield,
  ExternalLink,
  Loader2,
  Unlink
} from 'lucide-react';
import { connectionsService } from '../lib/connections/connectionsService';

interface ConnectionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConnectionStatus {
  whatsapp: {
    connected: boolean;
    phoneNumber?: string;
    businessName?: string;
    lastSync?: string;
  };
  gmail: {
    connected: boolean;
    email?: string;
    name?: string;
    lastSync?: string;
  };
}

const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({ isOpen, onClose }) => {
  const [connections, setConnections] = useState<ConnectionStatus>({
    whatsapp: { connected: false },
    gmail: { connected: false }
  });
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnectionStatus();
    }
  }, [isOpen]);

  const loadConnectionStatus = async () => {
    try {
      const status = await connectionsService.getConnectionStatus();
      setConnections(status);
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  };

  const handleConnect = async (service: 'whatsapp' | 'gmail') => {
    setIsConnecting(service);
    setError(null);

    try {
      if (service === 'whatsapp') {
        await connectionsService.connectWhatsApp();
      } else {
        await connectionsService.connectGmail();
      }
      
      // Reload status after connection
      await loadConnectionStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setError(errorMessage);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (service: 'whatsapp' | 'gmail') => {
    try {
      if (service === 'whatsapp') {
        await connectionsService.disconnectWhatsApp();
      } else {
        await connectionsService.disconnectGmail();
      }
      
      await loadConnectionStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnection failed';
      setError(errorMessage);
    }
  };

  const renderConnectionCard = (
    service: 'whatsapp' | 'gmail',
    icon: React.ReactNode,
    title: string,
    description: string,
    connectionData: any
  ) => {
    const isConnected = connectionData.connected;
    const isLoading = isConnecting === service;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              service === 'whatsapp' 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={() => setShowSettings(showSettings === service ? null : service)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {isConnected ? (
                <>
                  <Check className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Not Connected
                </>
              )}
            </div>
          </div>
        </div>

        {/* Connection Details */}
        {isConnected && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="space-y-2 text-sm">
              {service === 'whatsapp' && (
                <>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {connectionData.phoneNumber || 'Phone number not available'}
                    </span>
                  </div>
                  {connectionData.businessName && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {connectionData.businessName}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {service === 'gmail' && (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {connectionData.email || 'Email not available'}
                    </span>
                  </div>
                  {connectionData.name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {connectionData.name}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {connectionData.lastSync && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last synced: {new Date(connectionData.lastSync).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings === service && isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Connection Settings
              </h4>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() => handleDisconnect(service)}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <Unlink className="w-4 h-4" />
                  Disconnect {title}
                </button>
                <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  <ExternalLink className="w-4 h-4" />
                  Manage in {title}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <button
          onClick={() => isConnected ? handleDisconnect(service) : handleConnect(service)}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isConnected
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              : service === 'whatsapp'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : isConnected ? (
            'Disconnect'
          ) : (
            `Connect ${title}`
          )}
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              App Connections
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connect third-party apps for automated messaging
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Automation Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                AI-Powered Automation
              </h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Once connected, I can automatically send messages based on your commands:
            </p>
            <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
              <div>• <strong>WhatsApp:</strong> "Send hi to John on WhatsApp"</div>
              <div>• <strong>Gmail:</strong> "Write a mail to invite John for New Year at Times Square. Email is john@gmail.com"</div>
            </div>
          </div>

          {/* Connection Cards */}
          <div className="space-y-4">
            {renderConnectionCard(
              'whatsapp',
              <MessageCircle className="w-5 h-5" />,
              'WhatsApp',
              'Send messages via WhatsApp Business API',
              connections.whatsapp
            )}

            {renderConnectionCard(
              'gmail',
              <Mail className="w-5 h-5" />,
              'Gmail',
              'Send emails via Gmail API',
              connections.gmail
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Security & Privacy</h4>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>• All connections use secure OAuth2 authentication</p>
              <p>• Tokens are encrypted and stored securely</p>
              <p>• You can disconnect at any time</p>
              <p>• Messages are sent only with your explicit command</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConnectionsPanel;