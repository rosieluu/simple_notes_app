import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "./ui/sidebar"

// Configuration adaptée pour l'application de notes
const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "Simple Notes",
      logo: () => React.createElement("span", null, "📝"),
      plan: "Personal",
    },
  ],
  navMain: [
    {
      title: "Notes",
      url: "/dashboard",
      icon: () => React.createElement("span", null, "📝"),
      isActive: true,
      items: [
        {
          title: "All Notes",
          url: "/dashboard",
        },
        {
          title: "Recent",
          url: "/dashboard?filter=recent",
        },
        {
          title: "Favorites",
          url: "/dashboard?filter=favorites",
        },
      ],
    },
    {
      title: "Organization",
      url: "#",
      icon: () => React.createElement("span", null, "🏷️"),
      items: [
        {
          title: "Tags",
          url: "/dashboard?view=tags",
        },
        {
          title: "Categories",
          url: "/dashboard?view=categories",
        },
        {
          title: "Search",
          url: "/dashboard?view=search",
        },
      ],
    },
    {
      title: "Archive",
      url: "#",
      icon: () => React.createElement("span", null, "📦"),
      items: [
        {
          title: "Archived",
          url: "/dashboard?filter=archived",
        },
        {
          title: "Deleted",
          url: "/dashboard?filter=deleted",
        },
        {
          title: "Export",
          url: "/dashboard?action=export",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: () => React.createElement("span", null, "⚙️"),
      items: [
        {
          title: "General",
          url: "/dashboard/settings",
        },
        {
          title: "Preferences",
          url: "/dashboard/preferences",
        },
        {
          title: "Account",
          url: "/dashboard/account",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Personal Notes",
      url: "/dashboard?category=personal",
      icon: () => React.createElement("span", null, "�"),
    },
    {
      name: "Work Notes",
      url: "/dashboard?category=work",
      icon: () => React.createElement("span", null, "💼"),
    },
    {
      name: "Ideas & Inspiration",
      url: "/dashboard?category=ideas",
      icon: () => React.createElement("span", null, "💡"),
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Récupérer les vraies données utilisateur
  const currentUser = useQuery(api.notes.getCurrentUser);
  
  // Préparer les données utilisateur avec des valeurs par défaut
  const userData = {
    name: currentUser?.name || "User", // "User" au lieu de "Sans nom"
    email: currentUser?.email || "user@example.com",
    avatar: "/avatars/user.jpg", // Avatar par défaut
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}