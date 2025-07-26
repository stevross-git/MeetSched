import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/chat-interface";
import CalendarWidget from "@/components/calendar-widget";
import ContactsWidget from "@/components/contacts-widget";
import TodaySchedule from "@/components/today-schedule";
import { LoginDialog } from "@/components/login-dialog";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { Bot, Settings, User, History, SlidersHorizontal, Shield, Link as LinkIcon } from "lucide-react";

export default function Home() {
  const { user, token, login, logout, isLoading } = useAuth();
  
  const { data: todayBookings } = useQuery({
    queryKey: ["/api/bookings/today"],
  });

  const bookingsCount = Array.isArray(todayBookings) ? todayBookings.length : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Book Me</h1>
              <p className="text-sm text-gray-500">Smart Scheduling Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>AI Online</span>
                </div>
                
                {user.isPrivateMode && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                    <Shield className="w-3 h-3" />
                    <span>Private</span>
                  </div>
                )}
                
                {user.officeConnectionStatus === 'connected' && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    <LinkIcon className="w-3 h-3" />
                    <span>{user.officeConnectionType === 'microsoft' ? 'Outlook' : 'Google'}</span>
                  </div>
                )}
              </div>
            )}
            
            {user && token ? (
              <UserMenu user={user} token={token} onLogout={logout} />
            ) : (
              <LoginDialog onLoginSuccess={login} />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          
          {/* Chat Interface - 2/3 width */}
          <div className="lg:col-span-2 flex flex-col">
            <ChatInterface />
          </div>
          
          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            <CalendarWidget />
            <TodaySchedule />
            <ContactsWidget />
          </div>

        </div>
      </main>

      {/* Bottom Actions */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors">
              <History size={16} />
              <span className="hidden sm:inline">Booking History</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors">
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Preferences</span>
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            <span>{bookingsCount} bookings</span> scheduled today
          </div>
        </div>
      </div>
    </div>
  );
}
