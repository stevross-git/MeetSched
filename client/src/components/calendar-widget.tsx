import { ExternalLink } from "lucide-react";

export default function CalendarWidget() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  // Generate calendar days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevMonth = new Date(currentYear, currentMonth - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    days.push({
      day: prevMonthDays - startingDayOfWeek + i + 1,
      isCurrentMonth: false,
      isToday: false,
      hasEvent: false
    });
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      isCurrentMonth: true,
      isToday: day === currentDate,
      hasEvent: day === 19 // Mock event on 19th
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
        <button className="text-blue-600 hover:text-blue-700 transition-colors">
          <ExternalLink size={16} />
        </button>
      </div>
      
      <div className="text-center mb-4">
        <div className="text-sm text-gray-500 mb-1">
          {monthNames[currentMonth]} {currentYear}
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={`day-header-${index}`} className="text-center py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-sm">
          {days.map((dayObj, index) => (
            <div
              key={index}
              className={`text-center py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                !dayObj.isCurrentMonth
                  ? "text-gray-300"
                  : dayObj.isToday
                  ? "bg-blue-600 text-white"
                  : dayObj.hasEvent
                  ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {dayObj.day}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-gray-600">Scheduled</span>
        </div>
      </div>
    </div>
  );
}
