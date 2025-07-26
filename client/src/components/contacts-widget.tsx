import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Contact } from "@shared/schema";

export default function ContactsWidget() {
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600", 
      "from-green-400 to-green-600",
      "from-red-400 to-red-600",
      "from-yellow-400 to-yellow-600",
      "from-indigo-400 to-indigo-600"
    ];
    
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Frequent Contacts</h3>
        <button className="text-blue-600 hover:text-blue-700 transition-colors text-sm">
          <Plus size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(contact.name)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
              {getInitials(contact.name)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{contact.name}</div>
              <div className="text-sm text-gray-500">{contact.role}</div>
            </div>
            <div className={`w-2 h-2 rounded-full ${
              contact.status === "online" ? "bg-emerald-500" : "bg-gray-300"
            }`}></div>
          </div>
        ))}
        
        {contacts.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No contacts yet</p>
            <p className="text-xs mt-1">Contacts will appear here after AI identifies them in your booking requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
