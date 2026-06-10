"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
} from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()

    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  const { profile } = useAuth()

  const [greeting, setGreeting] = useState("Good morning")

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good morning")
    else if (hour < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  return (
    <div className="flex flex-col gap-8 pb-12 w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2 pt-6 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {greeting}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-muted-foreground text-sm">
          Here is an overview of your org today.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Active Conversations"
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(metrics.activeConversations.previous, 'new today'),
              }}
            />
            <MetricCard
              title="New Contacts Today"
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign: metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  'vs yesterday'
                ),
              }}
            />
            <MetricCard
              title="Open Deals Value"
              value={formatCurrency(metrics.openDealsValue)}
              icon={DollarSign}
              subtitle={`${metrics.openDealsCount} open deal${metrics.openDealsCount === 1 ? '' : 's'}`}
            />
            <MetricCard
              title="Messages Sent Today"
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign: metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  'vs yesterday'
                ),
              }}
            />
          </>
        )}
      </div>

      {/* Main Layout Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 mt-2">
        {/* Left Column - Main Charts */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-4">
          <div className="min-h-[350px] flex flex-col">
            <ConversationsChart
              series={series}
              loading={seriesLoading}
              range={range}
              onRangeChange={handleRangeChange}
            />
          </div>
          
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="min-h-[250px] flex flex-col">
              <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />
            </div>
            <div className="min-h-[250px] flex flex-col">
              <PipelineDonut data={pipeline} loading={pipelineLoading} />
            </div>
          </div>
        </div>

        {/* Right Column - Feed & Actions */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-4">
          <QuickActions />
          
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-6 pb-2 flex items-center justify-between">
              <h3 className="font-semibold leading-none tracking-tight">Activity Feed</h3>
              <div className="flex h-2 w-2 rounded-full bg-green-500/80"></div>
            </div>
            <div className="p-0 flex-1 overflow-y-auto">
              <ActivityFeed items={activity} loading={activityLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `No change ${suffix}`
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
