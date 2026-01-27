"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Settings, 
  LayoutDashboard,
  FileText,
  Book
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { searchDocuments, getRecentNotes, getRecentNotebooks } from "@/server/search"

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<any[]>([])
  const [recentNotes, setRecentNotes] = React.useState<any[]>([])
  const [recentNotebooks, setRecentNotebooks] = React.useState<any[]>([])
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (open) {
      getRecentNotes().then(response => {
        if (response.success) {
          setRecentNotes(response.results || [])
        }
      })
      getRecentNotebooks().then(response => {
        if (response.success) {
          setRecentNotebooks(response.results || [])
        }
      })
    }
  }, [open])

  // Debounce search
  React.useEffect(() => {
    if (!open) return;
    
    // Clear results if query is empty
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
        const response = await searchDocuments(query)
        if (response.success) {
          setResults(response.results || [])
        }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, open])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        {query === "" && recentNotebooks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Notebooks">
              {recentNotebooks.map((notebook) => (
                <CommandItem
                  key={`recent-notebook-${notebook.id}`}
                  value={notebook.title}
                  onSelect={() => {
                    runCommand(() => router.push(`/dashboard/notebook/${notebook.id}`))
                  }}
                >
                  <Book className="mr-2 h-4 w-4" />
                  <span>{notebook.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {query === "" && recentNotes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Notes">
              {recentNotes.map((note) => (
                <CommandItem
                  key={`recent-${note.id}`}
                  value={note.title}
                  onSelect={() => {
                    runCommand(() => router.push(`/dashboard/notebook/${note.notebookId}/note/${note.id}`))
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{note.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        
        {/* Search Results */}
        {results.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
                {results.map((item) => (
                <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={item.title} 
                    onSelect={() => {
                        if (item.type === 'notebook') {
                            runCommand(() => router.push(`/dashboard/notebook/${item.notebookId}`))
                        } else {
                            runCommand(() => router.push(`/dashboard/notebook/${item.notebookId}/note/${item.id}`))
                        }
                    }}
                >
                    {item.type === 'notebook' ? <Book className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                    <span>{item.title}</span>
                </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}

      </CommandList>
    </CommandDialog>
  )
}
