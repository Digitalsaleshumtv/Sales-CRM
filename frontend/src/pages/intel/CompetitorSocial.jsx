import { useState } from 'react'
import { RefreshCw, ExternalLink, ThumbsUp, MessageCircle, Share2, TrendingUp, Users, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

// Competitor Facebook pages — add/remove as needed
const COMPETITORS = [
  // HUM TV Group (our own for benchmarking)
  { label: 'HUM TV',           pageId: 'HUMTV',              group: 'HUM Group',  color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Masala TV',        pageId: 'masalatv',           group: 'HUM Group',  color: 'bg-red-100 text-red-700 border-red-200' },
  // Drama Competitors
  { label: 'ARY Digital',      pageId: 'ARYDigitalHD',       group: 'Drama',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Geo Entertainment',pageId: 'GeoEntertainment',   group: 'Drama',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Green Entertainment',pageId:'GreenEntertainmentPK',group:'Drama',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  // News Competitors
  { label: 'Geo News',         pageId: 'geonews',            group: 'News',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'ARY News',         pageId: 'arynewspk',          group: 'News',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Samaa TV',         pageId: 'samaatv',            group: 'News',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Dunya News',       pageId: 'DunyaNews',          group: 'News',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Express News',     pageId: 'expressurdu',        group: 'News',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  // Masala Competitors
  { label: 'ARY Zindagi',      pageId: 'ARYZindagi',         group: 'Lifestyle',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'Food Fusion',      pageId: 'FoodFusionPK',       group: 'Lifestyle',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
]

const GROUP_COLORS = {
  'HUM Group': 'bg-red-100 text-red-700',
  'Drama':     'bg-blue-100 text-blue-700',
  'News':      'bg-purple-100 text-purple-700',
  'Lifestyle': 'bg-orange-100 text-orange-700',
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function fmtNum(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n/1000).toFixed(1)}K`
  return String(n)
}

function PostCard({ post }) {
  const [expanded, setExpanded] = useState(false)
  const msg = post.message || post.story || ''
  const likes    = post.likes?.summary?.total_count || 0
  const comments = post.comments?.summary?.total_count || 0
  const shares   = post.shares?.count || 0
  const engagement = likes + comments + shares

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-3'}`}>{msg || <span className="text-gray-400 italic">No text content</span>}</p>
        {msg.length > 150 && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        )}
      </div>
      {post.full_picture && (
        <img src={post.full_picture} alt="" className="w-full rounded-lg object-cover max-h-40 mb-3 bg-gray-50"
          onError={e => e.target.style.display='none'}/>
      )}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><ThumbsUp size={12} className="text-blue-400"/> {fmtNum(likes)}</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} className="text-green-400"/> {fmtNum(comments)}</span>
          <span className="flex items-center gap-1"><Share2 size={12} className="text-purple-400"/> {fmtNum(shares)}</span>
          <span className="text-brand-500 font-medium">📊 {fmtNum(engagement)} total</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{timeAgo(post.created_time)}</span>
          <a href={`https://facebook.com/${post.id}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-brand-500">
            <ExternalLink size={11}/>
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CompetitorSocial() {
  const [selected, setSelected]     = useState(null)
  const [pageData, setPageData]     = useState(null)
  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [postLimit, setPostLimit]   = useState(10)
  const metaToken = import.meta.env.VITE_META_ACCESS_TOKEN || ''

  const groups = [...new Set(COMPETITORS.map(c => c.group))]

  async function loadPage(comp) {
    if (!metaToken) { setError('Meta Access Token required — add VITE_META_ACCESS_TOKEN to .env.local'); return }
    setSelected(comp)
    setLoading(true)
    setError('')
    setPageData(null)
    setPosts([])
    setPostLimit(10)

    try {
      // Fetch page info
      const pageRes = await fetch(
        `https://graph.facebook.com/v19.0/${comp.pageId}?fields=name,fan_count,followers_count,about,picture{url},link&access_token=${metaToken}`
      )
      const page = await pageRes.json()
      if (page.error) { setError(`Meta API: ${page.error.message}`); setLoading(false); return }
      setPageData(page)

      // Fetch posts
      const postsRes = await fetch(
        `https://graph.facebook.com/v19.0/${comp.pageId}/posts?fields=message,story,created_time,full_picture,likes.limit(0).summary(true),comments.limit(0).summary(true),shares&limit=30&access_token=${metaToken}`
      )
      const postsJson = await postsRes.json()
      if (postsJson.error) { setError(`Posts API: ${postsJson.error.message}`); setLoading(false); return }
      setPosts(postsJson.data || [])
    } catch (e) {
      setError('Failed to reach Meta API. Check your token.')
    }
    setLoading(false)
  }

  // Compute stats from posts
  const visiblePosts = posts.slice(0, postLimit)
  const totalLikes    = posts.reduce((s,p) => s + (p.likes?.summary?.total_count || 0), 0)
  const totalComments = posts.reduce((s,p) => s + (p.comments?.summary?.total_count || 0), 0)
  const totalShares   = posts.reduce((s,p) => s + (p.shares?.count || 0), 0)
  const avgLikes      = posts.length ? Math.round(totalLikes / posts.length) : 0
  const avgComments   = posts.length ? Math.round(totalComments / posts.length) : 0
  const avgEngagement = posts.length ? Math.round((totalLikes + totalComments + totalShares) / posts.length) : 0

  // Posting frequency — posts per day over last 30 posts
  let postsPerDay = 0
  if (posts.length >= 2) {
    const oldest = new Date(posts[posts.length-1]?.created_time)
    const newest = new Date(posts[0]?.created_time)
    const days   = Math.max(1, (newest - oldest) / 86400000)
    postsPerDay  = (posts.length / days).toFixed(1)
  }

  // Top post
  const topPost = [...posts].sort((a,b) =>
    ((b.likes?.summary?.total_count||0) + (b.comments?.summary?.total_count||0)) -
    ((a.likes?.summary?.total_count||0) + (a.comments?.summary?.total_count||0))
  )[0]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Competitor Social Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">Track competitor Facebook pages — posts, engagement & frequency</p>
      </div>

      {/* Token warning */}
      {!metaToken && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Meta Access Token required</p>
            <p className="mt-0.5">Add <code className="bg-amber-100 px-1 rounded">VITE_META_ACCESS_TOKEN=your_token</code> to <code className="bg-amber-100 px-1 rounded">frontend/.env.local</code> and restart.
            &nbsp;<a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="underline">Get token →</a></p>
          </div>
        </div>
      )}

      {/* What you can & can't see */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-blue-800 mb-2">✅ What you CAN see</p>
          <ul className="space-y-1 text-blue-700 text-xs">
            <li>• Follower & fan counts</li>
            <li>• All public posts & captions</li>
            <li>• Likes, comments & shares per post</li>
            <li>• Posting frequency (posts/day)</li>
            <li>• Post images & link previews</li>
            <li>• Their top performing content</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-red-700 mb-2">❌ What you CANNOT see</p>
          <ul className="space-y-1 text-red-600 text-xs">
            <li>• Stories (private, no public API)</li>
            <li>• Instagram posts/comments (requires their token)</li>
            <li>• Paid boost/ad spend on posts</li>
            <li>• Reach or impressions</li>
            <li>• Video view counts</li>
            <li>• DMs or private messages</li>
          </ul>
        </div>
      </div>

      {/* Competitor selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Select a Competitor Page to Monitor</h2>
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group}>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">{group}</p>
              <div className="flex flex-wrap gap-2">
                {COMPETITORS.filter(c => c.group === group).map(comp => (
                  <button key={comp.pageId}
                    onClick={() => loadPage(comp)}
                    disabled={loading}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:shadow-sm disabled:opacity-50 ${
                      selected?.pageId === comp.pageId
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : comp.color
                    }`}>
                    {loading && selected?.pageId === comp.pageId ? '⏳ ' : ''}{comp.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle size={16} className="inline mr-2"/>{error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/>
          <span className="ml-3 text-gray-500 text-sm">Loading {selected?.label} page data...</span>
        </div>
      )}

      {/* Page data */}
      {!loading && pageData && (
        <div className="space-y-5">
          {/* Page header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            {pageData.picture?.data?.url && (
              <img src={pageData.picture.data.url} alt={pageData.name}
                className="w-16 h-16 rounded-full border border-gray-200 object-cover"/>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{pageData.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${selected?.color}`}>{selected?.group}</span>
              </div>
              {pageData.about && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pageData.about}</p>}
              <a href={pageData.link || `https://facebook.com/${selected?.pageId}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-brand-500 hover:underline flex items-center gap-1 mt-1">
                <ExternalLink size={11}/> facebook.com/{selected?.pageId}
              </a>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{fmtNum(pageData.followers_count || pageData.fan_count)}</p>
              <p className="text-xs text-gray-400">Followers</p>
              {pageData.fan_count && pageData.followers_count && (
                <p className="text-xs text-gray-400 mt-0.5">{fmtNum(pageData.fan_count)} page likes</p>
              )}
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Posts Analyzed', value: posts.length, icon: Calendar, color: 'text-blue-500' },
              { label: 'Posts / Day',    value: postsPerDay,  icon: TrendingUp, color: 'text-green-500' },
              { label: 'Avg Likes',      value: fmtNum(avgLikes), icon: ThumbsUp, color: 'text-blue-400' },
              { label: 'Avg Comments',   value: fmtNum(avgComments), icon: MessageCircle, color: 'text-green-400' },
              { label: 'Avg Engagement', value: fmtNum(avgEngagement), icon: Users, color: 'text-brand-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                <s.icon size={18} className={`mx-auto mb-1 ${s.color}`}/>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top Post */}
          {topPost && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🏆 Top Performing Post <span className="text-xs text-gray-400 font-normal">(highest engagement)</span>
              </h3>
              <PostCard post={topPost}/>
            </div>
          )}

          {/* Posts feed */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Posts ({posts.length} loaded)</h3>
              <button onClick={() => loadPage(selected)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <RefreshCw size={12}/> Refresh
              </button>
            </div>
            <div className="p-4 space-y-3">
              {visiblePosts.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No posts found for this page</p>
              ) : (
                <>
                  {visiblePosts.map(post => <PostCard key={post.id} post={post}/>)}
                  {posts.length > postLimit && (
                    <button onClick={() => setPostLimit(l => l + 10)}
                      className="w-full py-2.5 text-sm text-brand-500 border border-brand-200 rounded-lg hover:bg-brand-50 font-medium">
                      Load more posts ({posts.length - postLimit} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !pageData && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-20"/>
          <p className="font-medium text-gray-500">Select a competitor above to load their page data</p>
          <p className="text-sm mt-1">Posts, engagement metrics and frequency will appear here</p>
        </div>
      )}
    </div>
  )
}
