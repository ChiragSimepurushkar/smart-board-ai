
# Kanban Board App

## Design
- Dark theme with purple accent colors inspired by reference image 2
- Collapsible icon sidebar with navigation (Dashboard, Board, Settings)
- Clean, modern card design with rounded corners and subtle shadows

## Pages & Layout
1. **Auth pages** — Login and Signup with email/password, dark themed
2. **Kanban Board** — Main workspace with two columns: To-Do and In Progress
3. **AI Chat panel** — Slide-out side panel for the AI chatbot

## Kanban Board Features
- **Two columns**: To-Do and In Progress with task counts
- **Task cards** showing: title, description, due date, priority badge (High/Medium/Low), and color-coded category tags (Design, Dev, Media, etc.)
- **Drag & drop** between columns using a drag-and-drop library
- **Add Task** button opens a modal form with all fields
- **Edit/Delete** tasks via card menu
- **"+ Add" button** on each column header

## AI Chatbot (Side Panel)
- Floating chat button that opens a slide-out panel
- Streaming AI responses using Lovable AI
- Can **create tasks** from natural language (e.g., "Add a high priority design task due Friday")
- Provides **productivity insights** (e.g., "You have 3 overdue tasks")
- Chat history within the session

## Backend (Lovable Cloud + Supabase)
- **Authentication**: Email/password login & signup with protected routes
- **Database tables**: `profiles`, `tasks` (title, description, status, priority, category, due_date, user_id, position)
- **RLS policies**: Users can only access their own tasks
- **Edge function**: AI chat endpoint using Lovable AI gateway for task creation and insights

## Key Interactions
- Drag a card from To-Do → In Progress (and vice versa) to update status
- Click "Add Task" → fill modal → task appears in the selected column
- Open AI chat → type "Create a task to review wireframes, high priority, due March 5" → task auto-creates on board
- All changes persist to database in real-time
