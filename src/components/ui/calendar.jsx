import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

const Calendar = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("p-3", className)}
      {...props}
    >
      <CalendarContent />
    </div>
  );
});
Calendar.displayName = "Calendar";

const CalendarContent = () => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();
  
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };
  
  const handleDateSelect = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };
  
  const renderDays = () => {
    const daysArray = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      daysArray.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate.getDate() === day && 
                        selectedDate.getMonth() === currentDate.getMonth() &&
                        selectedDate.getFullYear() === currentDate.getFullYear();
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === currentDate.getMonth() &&
                     new Date().getFullYear() === currentDate.getFullYear();
      
      daysArray.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={cn(
            "p-2 text-sm rounded-md hover:bg-gray-100 transition-colors",
            isSelected && "bg-blue-500 text-white hover:bg-blue-600",
            isToday && !isSelected && "bg-gray-200 font-semibold",
            "focus:outline-none focus:ring-2 focus:ring-blue-500"
          )}
        >
          {day}
        </button>
      );
    }
    
    return daysArray;
  };
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousMonth}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 w-8 p-0"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <h3 className="text-sm font-medium">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 w-8 p-0"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
};

export { Calendar };
