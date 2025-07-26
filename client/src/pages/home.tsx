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
    enabled: !!user && !!token, // Only fetch when authenticated
  });

  const bookingsCount = Array.isArray(todayBookings) ? todayBookings.length : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Book Me...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user || !token) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
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
            
            <LoginDialog onLoginSuccess={login} />
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="text-white text-4xl" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Schedule Smarter with AI
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Transform natural language into perfect calendar bookings. Just say 
                "Book me a meeting with Sam next week" and let AI handle the rest.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Bot className="text-blue-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Natural Language</h3>
                <p className="text-gray-600 text-sm">
                  Book meetings using everyday language like "Schedule a call tomorrow at 2pm"
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <LinkIcon className="text-purple-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar Sync</h3>
                <p className="text-gray-600 text-sm">
                  Seamlessly integrate with Outlook and Google Calendar
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Shield className="text-green-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
                <p className="text-gray-600 text-sm">
                  Your data is secure with enterprise-grade privacy controls
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <LoginDialog onLoginSuccess={login} />
              <p className="text-sm text-gray-500">
                Sign in to start scheduling with AI assistance
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
            <p>&copy; 2024 AI Book Me. Built with ❤️ for smarter scheduling.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated user interface
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
              <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
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
            
            <UserMenu user={user} token={token} onLogout={logout} />
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