import * as React from "react"

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

// Configuration simple pour commencer
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
      title: "Dashboard",
      url: "/dashboard",
      icon: () => React.createElement("span", null, "🏠"),
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
      title: "Create",
      url: "#",
      icon: () => React.createElement("span", null, "➕"),
      items: [
        {
          title: "New Note",
          url: "#new-note",
        },
        {
          title: "Quick Note",
          url: "#quick-note",
        },
      ],
    },
    {
      title: "Organize",
      url: "#",
      icon: () => React.createElement("span", null, "🏷️"),
      items: [
        {
          title: "All Tags",
          url: "/dashboard?view=tags",
        },
        {
          title: "Categories",
          url: "/dashboard?view=categories",
        },
      ],
    },
    {
      title: "Archive",
      url: "#",
      icon: () => React.createElement("span", null, "📦"),
      items: [
        {
          title: "Archived Notes",
          url: "/dashboard?filter=archived",
        },
        {
          title: "Deleted Notes", 
          url: "/dashboard?filter=deleted",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Personal Notes",
      url: "/dashboard?category=personal",
      icon: () => React.createElement("span", null, "📝"),
    },
    {
      name: "Work Notes",
      url: "/dashboard?category=work", 
      icon: () => React.createElement("span", null, "💼"),
    },
    {
      name: "Ideas",
      url: "/dashboard?category=ideas",
      icon: () => React.createElement("span", null, "💡"),
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}