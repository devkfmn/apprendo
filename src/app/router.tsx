import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireLearnerAccess } from '@/components/auth/RequireLearnerAccess'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/useAuth'
import { roleHome } from '@/lib/utils'
import { CoachGoalsPage } from '@/pages/CoachGoalsPage'
import { CoachJournalDetailPage } from '@/pages/CoachJournalDetailPage'
import { CoachJournalListPage } from '@/pages/CoachJournalListPage'
import { CoachReportDetailPage } from '@/pages/CoachReportDetailPage'
import { CoachReportsListPage } from '@/pages/CoachReportsListPage'
import { CoachRoadmapPage } from '@/pages/CoachRoadmapPage'
import { CoachSemestersPage } from '@/pages/CoachSemestersPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { JournalEditPage } from '@/pages/JournalEditPage'
import { JournalListPage } from '@/pages/JournalListPage'
import { LearnerListPage } from '@/pages/LearnerListPage'
import { LearnerOverviewPage } from '@/pages/LearnerOverviewPage'
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { ReportEditPage } from '@/pages/ReportEditPage'
import { ReportsListPage } from '@/pages/ReportsListPage'
import { RoadmapPage } from '@/pages/RoadmapPage'
import { SignupPage } from '@/pages/SignupPage'

function RoleIndex() {
  const { profile } = useAuth()
  if (profile?.role === 'coach' || profile?.role === 'observer') {
    return <Navigate to={roleHome(profile.role)} replace />
  }
  return (
    <RequireAuth roles="learner">
      <AppShell>
        <OverviewPage />
      </AppShell>
    </RequireAuth>
  )
}

function LearnerArea() {
  return (
    <RequireAuth roles="learner">
      <AppShell />
    </RequireAuth>
  )
}

function CoachArea() {
  return (
    <RequireAuth roles="coach">
      <AppShell />
    </RequireAuth>
  )
}

function ObserverArea() {
  return (
    <RequireAuth roles="observer">
      <AppShell />
    </RequireAuth>
  )
}

function ProtectedIndex() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  )
}

const viewerLearnerRoutes = [
  { index: true, element: <LearnerOverviewPage /> },
  { path: 'journal', element: <CoachJournalListPage /> },
  { path: 'journal/:entryId', element: <CoachJournalDetailPage /> },
  { path: 'reports', element: <CoachReportsListPage /> },
  { path: 'reports/:reportId', element: <CoachReportDetailPage /> },
  { path: 'goals', element: <CoachGoalsPage /> },
  { path: 'roadmap', element: <CoachRoadmapPage /> },
  { path: 'semesters', element: <CoachSemestersPage /> },
]

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forbidden', element: <ForbiddenPage /> },
  {
    element: <ProtectedIndex />,
    children: [
      { path: '/', element: <RoleIndex /> },
      {
        element: <LearnerArea />,
        children: [
          { path: '/journal', element: <JournalListPage /> },
          { path: '/journal/new', element: <JournalEditPage /> },
          { path: '/journal/:entryId', element: <JournalEditPage /> },
          { path: '/reports', element: <ReportsListPage /> },
          { path: '/reports/new', element: <ReportEditPage /> },
          { path: '/reports/:reportId', element: <ReportEditPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/roadmap', element: <RoadmapPage /> },
        ],
      },
      {
        element: <CoachArea />,
        children: [
          { path: '/coach', element: <LearnerListPage /> },
          {
            path: '/coach/learners/:learnerId',
            element: <RequireLearnerAccess />,
            children: viewerLearnerRoutes,
          },
        ],
      },
      {
        element: <ObserverArea />,
        children: [
          { path: '/beobachter', element: <LearnerListPage /> },
          {
            path: '/beobachter/learners/:learnerId',
            element: <RequireLearnerAccess />,
            children: viewerLearnerRoutes,
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
