"use client"

import React, { useState } from "react"
import Link from "next/link"
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
  List as ListIcon,
  Wand2,
  Settings,
  RefreshCw,
  KeyRound,
  Share2,
  UserPlus,
  Inbox,
  Check,
  X,
  Users
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
    createVaultGroup, 
    createVaultEntry, 
    updateVaultEntry, 
    deleteVaultEntry,
    inviteUserToVault,
    respondToInvitation
} from "@/server/vaults"

// Types
export interface PasswordEntry {
  id: string
  groupId: string
  title: string
  username: string
  password: string
  website?: string | null
  notes?: string | null
  createdAt?: Date | null
}

export interface PasswordGroup {
  id: string
  name: string
  entries: PasswordEntry[]
  isShared?: boolean
  permissions?: {
      canEdit: boolean;
      canCreate: boolean;
      canDelete: boolean;
  }
}

export interface VaultInvitation {
    id: string;
    vaultGroupId: string;
    userId: string;
    invitedBy: string;
    status: string;
    canEdit: boolean;
    canCreate: boolean;
    canDelete: boolean;
    createdAt: Date | null;
    group: {
        name: string;
    };
    inviter: {
        name: string;
        email: string;
    };
}

interface PasswordGenerationSettings {
  length: number
  useUppercase: boolean
  useLowercase: boolean
  useNumbers: boolean
  useSymbols: boolean
}

interface VaultInterfaceProps {
    initialGroups: PasswordGroup[];
    initialInvitations: VaultInvitation[];
}

export function VaultInterface({ initialGroups, initialInvitations }: VaultInterfaceProps) {
  const [groups, setGroups] = useState<PasswordGroup[]>(initialGroups)
  // Flatten initial entries for easier management, or derive them?
  // Let's keep a synchronized state of all entries for easier filtering
  const [entries, setEntries] = useState<PasswordEntry[]>(
      initialGroups.flatMap(g => g.entries)
  )
  const [invitations, setInvitations] = useState<VaultInvitation[]>(initialInvitations)
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Dialog States
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null)
  const [isGeneratorSettingsOpen, setIsGeneratorSettingsOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  
  // Form States
  const [newGroupName, setNewGroupName] = useState("")
  const [entryForm, setEntryForm] = useState<Partial<PasswordEntry>>({})
  const [generatorSettings, setGeneratorSettings] = useState<PasswordGenerationSettings>({
    length: 16,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: true,
  })
  
  // Toggle Password Visibility State (per entry id)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  // Loading states
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  
  // Share Dialog State
  const [isShareGroupOpen, setIsShareGroupOpen] = useState(false)
  const [groupToShare, setGroupToShare] = useState<PasswordGroup | null>(null)
  const [shareEmail, setShareEmail] = useState("")
  const [sharePermissions, setSharePermissions] = useState({
      canEdit: false,
      canCreate: false,
      canDelete: false
  })
  const [isSharing, setIsSharing] = useState(false)

  const filteredEntries = entries.filter((entry) => {
    const matchesGroup = selectedGroupId === "all" || entry.groupId === selectedGroupId
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      entry.username.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesGroup && matchesSearch
  })

  // Derive permissions for current view
  const currentGroup = groups.find(g => g.id === selectedGroupId)
  const canCreateInCurrent = !currentGroup || !currentGroup.isShared || (currentGroup.isShared && currentGroup.permissions?.canCreate);
  // For 'all' view, we might want to restrict creation to owned groups only or force selecting a group
  
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    setIsCreatingGroup(true);
    try {
        const result = await createVaultGroup(newGroupName);
        if (result.success && result.group) {
            const newGroup: PasswordGroup = { ...result.group, entries: [] };
            setGroups([...groups, newGroup]);
            setNewGroupName("");
            setIsAddGroupOpen(false);
            toast.success("Group created successfully");
        } else {
            toast.error(result.error || "Failed to create group");
        }
    } catch {
        toast.error("Failed to create group");
    } finally {
        setIsCreatingGroup(false);
    }
  }

  const openShareDialog = (group: PasswordGroup) => {
    setGroupToShare(group)
    setShareEmail("")
    setSharePermissions({
        canEdit: false,
        canCreate: false,
        canDelete: false
    })
    setIsShareGroupOpen(true)
  }

  const handleShareSubmit = async () => {
    if(!shareEmail || !groupToShare) {
        toast.error("Please enter an email")
        return;
    }
    
    setIsSharing(true)
    try {
        const result = await inviteUserToVault({
            vaultGroupId: groupToShare.id,
            email: shareEmail,
            permissions: sharePermissions
        })

        if (result.success) {
            toast.success(`Invite sent to ${shareEmail}`)
            setIsShareGroupOpen(false)
        } else {
            toast.error(result.error || "Failed to share vault")
        }
    } catch (e) {
        toast.error("An unexpected error occurred")
    } finally {
        setIsSharing(false)
    }
  }

  const handleRespondInvitation = async (id: string, accept: boolean) => {
      try {
          const result = await respondToInvitation(id, accept);
          if (result.success) {
              setInvitations(invitations.filter(i => i.id !== id));
              if (accept) {
                  toast.success("Invitation accepted. The vault will appear shortly.");
                  // Ideally we would fetch the new vault here or revalidate logic handles it on refresh
                  // Since 'groups' is local state, we might need to refresh the page or setup a mechanism 
                  // to fetch the new group structure.
                  // For now, let's ask user to refresh or trigger a reload
                  window.location.reload(); 
              } else {
                  toast.success("Invitation rejected");
              }
          } else {
              toast.error(result.error || "Failed to respond");
          }
      } catch (e) {
          toast.error("Failed to respond");
      }
  }

  const handleSaveEntry = async () => {
    if (!entryForm.title || !entryForm.password || !entryForm.username) {
      toast.error("Please fill in required fields")
      return
    }

    // Default to first group if "all" is selected or no group selected
    // Better logic: If "all", check if we have any groups. Prioritize owned groups.
    const targetGroupId = entryForm.groupId || (selectedGroupId !== 'all' ? selectedGroupId : groups[0]?.id);
    
    if (!targetGroupId) {
         toast.error("Please create a group first");
         return;
    }

    setIsSavingEntry(true);

    try {
        if (editingEntry) {
            const result = await updateVaultEntry(editingEntry.id, {
                title: entryForm.title,
                username: entryForm.username,
                password: entryForm.password,
                website: entryForm.website || "",
                notes: entryForm.notes || "",
                groupId: entryForm.groupId || editingEntry.groupId 
            });

            if (result.success && result.entry) {
                const updated = result.entry;
                 const safeEntry = { 
                    ...updated, 
                    website: updated.website || undefined, 
                    notes: updated.notes || undefined 
                } as unknown as PasswordEntry;


                setEntries(entries.map(e => e.id === editingEntry.id ? safeEntry : e))
                toast.success("Password updated")
                setIsAddEntryOpen(false)
                setEditingEntry(null)
                setEntryForm({})
            } else {
                toast.error(result.error || "Failed to update entry");
            }
        } else {
            const result = await createVaultEntry({
                groupId: targetGroupId,
                title: entryForm.title,
                username: entryForm.username,
                password: entryForm.password,
                website: entryForm.website || undefined,
                notes: entryForm.notes || undefined,
            });

            if (result.success && result.entry) {
                const newEntry = result.entry as unknown as PasswordEntry;
                setEntries([...entries, newEntry]);
                toast.success("Password added");
                setIsAddEntryOpen(false)
                setEntryForm({})
            } else {
                toast.error(result.error || "Failed to create entry");
            }
        }
    } finally {
        setIsSavingEntry(false);
    }
  }

  const handleDeleteEntry = async (id: string) => {
    setIsDeletingEntry(true);
    try {
        const result = await deleteVaultEntry(id);
        if (result.success) {
            setEntries(entries.filter(e => e.id !== id))
            toast.success("Password deleted")
            setEntryToDelete(null);
        } else {
            toast.error(result.error || "Failed to delete entry");
        }
    } finally {
        setIsDeletingEntry(false);
    }
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

  const generatePassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    let chars = ""
    if (generatorSettings.useUppercase) chars += uppercase
    if (generatorSettings.useLowercase) chars += lowercase
    if (generatorSettings.useNumbers) chars += numbers
    if (generatorSettings.useSymbols) chars += symbols
    
    if (chars === "") {
        toast.error("Please select at least one character type")
        return
    }

    let password = ""
    for (let i = 0; i < generatorSettings.length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    setEntryForm(prev => ({ ...prev, password }))
    toast.success("Password generated")
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
          {invitations.length > 0 && (
              <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Inbox className="h-3 w-3" /> Invitations
                  </div>
                  {invitations.map(invite => (
                      <div key={invite.id} className="p-2 rounded-lg bg-muted/50 text-sm border space-y-2">
                          <div className="font-medium truncate">{invite.group.name}</div>
                          <div className="text-xs text-muted-foreground truncate">from {invite.inviter.name}</div>
                          <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                className="h-7 w-full text-xs" 
                                onClick={() => handleRespondInvitation(invite.id, true)}
                              >
                                  Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 w-full text-xs" 
                                onClick={() => handleRespondInvitation(invite.id, false)}
                              >
                                  Reject
                              </Button>
                          </div>
                      </div>
                  ))}
                  <div className="h-px bg-border my-2" />
              </div>
          )}

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
              <div key={group.id} className="flex items-center group/item w-full">
                <Button
                    variant={selectedGroupId === group.id ? "secondary" : "ghost"}
                    className="flex-1 justify-start gap-2 truncate"
                    onClick={() => setSelectedGroupId(group.id)}
                >
                    {group.isShared ? <Users className="h-4 w-4 shrink-0 text-blue-500" /> : <Folder className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{group.name}</span>
                </Button>
                 {!group.isShared && (
                  <div className="flex items-center ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity focus-within:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            openShareDialog(group);
                        }}
                        title="Share Group"
                    >
                        <Share2 className="h-4 w-4" />
                    </Button>
                    <Link href={`/dashboard/password-vaults/${group.id}/settings`} passHref>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Navigation handled by Link, but stop prop prevents group selection
                            }}
                            title="Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </Link>
                  </div>
                 )}
              </div>
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
                {canCreateInCurrent && (
                    <DialogTrigger asChild>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Password</span>
                    </Button>
                    </DialogTrigger>
                )}
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
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="password"
                            type="password" // Always hide in edit mode inputs for safety, maybe show toggle later
                            value={entryForm.password || ""}
                            onChange={(e) => setEntryForm({...entryForm, password: e.target.value})}
                            placeholder="••••••••"
                          />
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="outline" type="button" onClick={generatePassword}>
                                  <Wand2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Generate Password</p>
                              </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                         <Dialog open={isGeneratorSettingsOpen} onOpenChange={setIsGeneratorSettingsOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="outline" type="button">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Password Generator Settings</DialogTitle>
                                    <DialogDescription>
                                        Customize how your passwords are generated.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                     <div className="grid gap-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="length">Length: {generatorSettings.length}</Label>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="8" 
                                            max="64" 
                                            value={generatorSettings.length}
                                            onChange={(e) => setGeneratorSettings({...generatorSettings, length: parseInt(e.target.value)})}
                                            className="w-full accent-primary"
                                        />
                                     </div>
                                     <div className="grid gap-2">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id="uppercase"
                                                checked={generatorSettings.useUppercase}
                                                onChange={(e) => setGeneratorSettings({...generatorSettings, useUppercase: e.target.checked})}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="uppercase">Uppercase Letters (A-Z)</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id="lowercase"
                                                checked={generatorSettings.useLowercase}
                                                onChange={(e) => setGeneratorSettings({...generatorSettings, useLowercase: e.target.checked})}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="lowercase">Lowercase Letters (a-z)</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id="numbers"
                                                checked={generatorSettings.useNumbers}
                                                onChange={(e) => setGeneratorSettings({...generatorSettings, useNumbers: e.target.checked})}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="numbers">Numbers (0-9)</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id="symbols"
                                                checked={generatorSettings.useSymbols}
                                                onChange={(e) => setGeneratorSettings({...generatorSettings, useSymbols: e.target.checked})}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="symbols">Symbols (!@#$)</Label>
                                        </div>
                                     </div>
                                </div>
                            </DialogContent>
                         </Dialog>
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
                                {groups
                                    .filter(g => !g.isShared || (g.isShared && g.permissions?.canCreate))
                                    .map(g => (
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
                <div className="">
                    <KeyRound className="h-12 w-12 text-primary" />
                </div>
                <p>No passwords found in this group.</p>
                {canCreateInCurrent && (
                     <Button variant="outline" onClick={() => setIsAddEntryOpen(true)}>Add your first password</Button>
                )}
             </div>
          ) : (
            <div className={cn(
                "grid gap-4",
                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
              )}>
              {filteredEntries.map((entry) => {
                  const entryGroup = groups.find(g => g.id === entry.groupId);
                  const canEdit = !entryGroup?.isShared || entryGroup.permissions?.canEdit;
                  // For deletion: owner or canDelete
                  const canDelete = !entryGroup?.isShared || entryGroup.permissions?.canDelete;

                  return (
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
                        {canEdit && (
                            <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => setEntryToDelete(entry.id)}
                            >
                               <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        )}
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
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the password entry for 
              <span className="font-semibold text-foreground"> "{entries.find(e => e.id === entryToDelete)?.title}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => entryToDelete && handleDeleteEntry(entryToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isShareGroupOpen} onOpenChange={setIsShareGroupOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Share "{groupToShare?.name}"</DialogTitle>
                <DialogDescription>
                    Invite collaborators to this password vault.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="share-email">Email Address</Label>
                    <Input 
                        id="share-email" 
                        placeholder="colleague@example.com"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                    />
                </div>
                 <div className="grid gap-3">
                    <Label>Permissions</Label>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox"
                            id="p-view" 
                            checked={true} 
                            disabled 
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        />
                        <label
                            htmlFor="p-view"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            View (Default)
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox"
                            id="p-create" 
                            checked={sharePermissions.canCreate}
                            onChange={(e) => setSharePermissions(p => ({...p, canCreate: e.target.checked, canEdit: e.target.checked || p.canEdit}))}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        />
                         <label
                            htmlFor="p-create"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Create Items
                        </label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox"
                            id="p-edit" 
                            checked={sharePermissions.canEdit}
                            onChange={(e) => setSharePermissions(p => ({...p, canEdit: e.target.checked}))}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        />
                         <label
                            htmlFor="p-edit"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Edit Items
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox"
                            id="p-delete" 
                            checked={sharePermissions.canDelete}
                            onChange={(e) => setSharePermissions(p => ({...p, canDelete: e.target.checked}))}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        />
                         <label
                            htmlFor="p-delete"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Delete Items
                        </label>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleShareSubmit} disabled={isSharing}>
                    {isSharing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Share Vault
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
