import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Building, Mail, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AddContactDialog } from "./add-contact-dialog";

interface Person {
  id: number;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
  status: string;
  isFromOffice: boolean;
  officeId?: string;
}

export default function ContactsWidget() {
  const { toast } = useToast();
  
  const { data: people = [], isLoading, refetch } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Sync office data
  const syncOfficeData = async () => {
    try {
      const response = await apiRequest("POST", "/api/office/sync");
      const result = await response.json();
      
      toast({
        title: "Sync Complete", 
        description: result.message || "Contacts synchronized successfully",
      });
      
      // Refresh people data
      refetch();
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync contacts. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'busy':
        return 'bg-red-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Separate office contacts from manual contacts
  const officeContacts = people.filter(p => p.isFromOffice);
  const manualContacts = people.filter(p => !p.isFromOffice);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">People</h3>
          {people.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {people.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={syncOfficeData}
            className="text-blue-600 hover:text-blue-700"
            title="Sync with Office Contacts"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <AddContactDialog 
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                title="Add Contact"
              >
                <Plus size={16} />
              </Button>
            }
          />
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Office Contacts Section */}
        {officeContacts.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Building className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Office Contacts</h4>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {officeContacts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {officeContacts.map((person) => (
                <div
                  key={`office-${person.id}`}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(person.name)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                        {getInitials(person.name)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(person.status)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium text-gray-900 truncate">{person.name}</div>
                      <Building className="w-3 h-3 text-blue-500 flex-shrink-0" title="Office Contact" />
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {person.role || person.email || 'No details'}
                    </div>
                  </div>
                  {person.email && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Mail className="w-4 h-4 text-gray-400" title={person.email} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Contacts Section */}
        {manualContacts.length > 0 && (
          <div>
            {officeContacts.length > 0 && <div className="border-t border-gray-100 my-4"></div>}
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-gray-600" />
              <h4 className="text-sm font-medium text-gray-900">My Contacts</h4>
              <Badge variant="outline" className="text-xs">
                {manualContacts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {manualContacts.map((person) => (
                <div
                  key={`manual-${person.id}`}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(person.name)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                      {getInitials(person.name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(person.status)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{person.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {person.role || person.email || 'No details'}
                    </div>
                  </div>
                  {person.email && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Mail className="w-4 h-4 text-gray-400" title={person.email} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {people.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="text-xs mt-1 mb-4">Add contacts manually or sync from your office calendar</p>
            <div className="flex justify-center space-x-2">
              <AddContactDialog 
                trigger={
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                }
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={syncOfficeData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Contacts
              </Button>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {people.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{officeContacts.length} from office</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>{manualContacts.length} manual</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}