"use client"

import React, { useState } from "react"
import {
  Plus,
  Folder,
  Lock,
  Copy,
  Eye,
  EyeOff,
  MoreVertical,
  Search,
  Trash2,
  Edit2,
  Globe,
  Key,
  Shield,
  ShieldCheck,
  LayoutGrid,
  List as ListIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Types
interface PasswordGroup {
  id: string
  name: string
  icon?: React.ReactNode
}

interface PasswordEntry {
  id: string
  groupId: string
  title: string
  username: string
  password: string
  website?: string
  notes?: string
  createdAt: Date
}

// Mock Data
const MOCK_GROUPS: PasswordGroup[] = [
  { id: "1", name: "Personal" },
  { id: "2", name: "Work" },
  { id: "3", name: "Social Media" },
  { id: "4", name: "Finance" },
]

const MOCK_ENTRIES: PasswordEntry[] = [
  {
    id: "1",
    groupId: "3",
    title: "Facebook",
    username: "roberto.rc",
    password: "password123",
    website: "https://facebook.com",
    createdAt: new Date(),
  },
  {
    id: "2",
    groupId: "1",
    title: "Netflix",
    username: "rob@gmail.com",
    password: "secureUser1!",
    website: "https://netflix.com",
    createdAt: new Date(),
  },
  {
    id: "3",
    groupId: "2",
    title: "AWS Console",
    username: "admin-root",
    password: "complexPasswordHash#",
    website: "https://aws.amazon.com",
    createdAt: new Date(),
  },
]

export function VaultInterface() {
  const [groups, setGroups] = useState<PasswordGroup[]>(MOCK_GROUPS)
  const [entries, setEntries] = useState<PasswordEntry[]>(MOCK_ENTRIES)
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Dialog States
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null)
  
  // Form States
  const [newGroupName, setNewGroupName] = useState("")
  const [entryForm, setEntryForm] = useState<Partial<PasswordEntry>>({})
  
  // Toggle Password Visibility State (per entry id)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  const filteredEntries = entries.filter((entry) => {
    const matchesGroup = selectedGroupId === "all" || entry.groupId === selectedGroupId
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesGroup && matchesSearch
  })

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    const newGroup: PasswordGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
    }
    setGroups([...groups, newGroup])
    setNewGroupName("")
    setIsAddGroupOpen(false)
    toast.success("Group created successfully")
  }

  const handleSaveEntry = () => {
    if (!entryForm.title || !entryForm.password || !entryForm.username) {
      toast.error("Please fill in required fields")
      return
    }

    if (editingEntry) {
      setEntries(entries.map(e => e.id === editingEntry.id ? { ...e, ...entryForm } as PasswordEntry : e))
      toast.success("Password updated")
    } else {
      const newEntry: PasswordEntry = {
        ...(entryForm as PasswordEntry),
        id: Math.random().toString(36).substr(2, 9),
        groupId: selectedGroupId === "all" ? groups[0].id : selectedGroupId,
        createdAt: new Date(),
      }
      setEntries([...entries, newEntry])
      toast.success("Password added")
    }
    setIsAddEntryOpen(false)
    setEditingEntry(null)
    setEntryForm({})
  }

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id))
    toast.success("Password deleted")
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const openEditDialog = (entry: PasswordEntry) => {
    setEditingEntry(entry)
    setEntryForm(entry)
    setIsAddEntryOpen(true)
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-6 md:flex-row">
      {/* Sidebar */}
      <Card className="w-full md:w-64 flex-shrink-0 h-full overflow-hidden flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Vaults
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            <Button
              variant={selectedGroupId === "all" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setSelectedGroupId("all")}
            >
              <LayoutGrid className="h-4 w-4" />
              All Items
            </Button>
            {groups.map((group) => (
              <Button
                key={group.id}
                variant={selectedGroupId === group.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setSelectedGroupId(group.id)}
              >
                <Folder className="h-4 w-4" />
                {group.name}
              </Button>
            ))}
          </div>
        </CardContent>
        <div className="p-4 border-t">
          <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" /> New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Organize your passwords into folders.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Work, Personal"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Main Content */}
      <Card className="flex-1 h-full flex flex-col overflow-hidden">
        <CardHeader className="border-b space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>
                {selectedGroupId === "all" 
                  ? "All Passwords" 
                  : groups.find(g => g.id === selectedGroupId)?.name || "Passwords"}
              </CardTitle>
              <CardDescription>
                {filteredEntries.length} entries found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search passwords..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Dialog open={isAddEntryOpen} onOpenChange={(open) => {
                setIsAddEntryOpen(open)
                if(!open) {
                  setEditingEntry(null)
                  setEntryForm({})
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Password</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingEntry ? "Edit Password" : "New Password"}</DialogTitle>
                    <DialogDescription>
                      Store your credentials securely.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={entryForm.title || ""}
                        onChange={(e) => setEntryForm({...entryForm, title: e.target.value})}
                        placeholder="e.g. Netflix"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={entryForm.username || ""}
                        onChange={(e) => setEntryForm({...entryForm, username: e.target.value})}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type="password" // Always hide in edit mode inputs for safety, maybe show toggle later
                          value={entryForm.password || ""}
                          onChange={(e) => setEntryForm({...entryForm, password: e.target.value})}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="website">Website (Optional)</Label>
                      <Input
                        id="website"
                        value={entryForm.website || ""}
                        onChange={(e) => setEntryForm({...entryForm, website: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="group">Group</Label>
                        <Select 
                            value={entryForm.groupId || (selectedGroupId === 'all' ? groups[0]?.id : selectedGroupId)}
                            onValueChange={(value) => setEntryForm({...entryForm, groupId: value})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveEntry}>Save Entry</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/50">
          {filteredEntries.length === 0 ? (
             <div className="flex h-full flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="p-4 bg-background rounded-full shadow-sm">
                    <Shield className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <p>No passwords found in this group.</p>
                <Button variant="outline" onClick={() => setIsAddEntryOpen(true)}>Add your first password</Button>
             </div>
          ) : (
            <div className={cn(
                "grid gap-4",
                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}>
              {filteredEntries.map((entry) => (
                <Card key={entry.id} className="group hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                             {entry.website ? <Globe className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <CardTitle className="text-base truncate" title={entry.title}>
                                {entry.title}
                            </CardTitle>
                        </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyToClipboard(entry.username, "Username")}>
                            <Copy className="mr-2 h-4 w-4" /> Copy Username
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(entry.password, "Password")}>
                            <Key className="mr-2 h-4 w-4" /> Copy Password
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                           <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteEntry(entry.id)}>
                           <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">Username</p>
                            <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1">
                                <span className="text-sm truncate select-all">{entry.username}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(entry.username, "Username")}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">Password</p>
                            <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1">
                                <span className="text-sm truncate font-mono">
                                    {visiblePasswords[entry.id] ? entry.password : "••••••••••••"}
                                </span>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => togglePasswordVisibility(entry.id)}>
                                        {visiblePasswords[entry.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(entry.password, "Password")}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {entry.website && (
                             <a 
                                href={entry.website} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-2 transition-colors truncate"
                             >
                                {entry.website.replace(/^https?:\/\//, '')}
                                <Globe className="h-3 w-3" />
                             </a>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
