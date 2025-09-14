// route.ts
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const respondWithPostMessage = (payload: any) => {
    const safe = JSON.stringify(payload).replace(/</g, "\\u003c");
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
      <script>
        try {
          const payload = ${safe};
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
          }
        } catch (e) {}
        document.body.innerText = 'Authentication complete. You may close this window.';
        setTimeout(()=>{ try{ window.close(); } catch(e){} }, 1200);
      </script>
    </body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  };

  if (!code) {
    return respondWithPostMessage({ success: false, error: "Missing code in callback", state });
  }

  const clean = (v?: string | null) => (v || "").toString().trim().replace(/^['"]|['"]$/g, "") || undefined;

  const APP_ID = clean(process.env.INSTAGRAM_APP_ID) || clean(process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID);
  const APP_SECRET = clean(process.env.INSTAGRAM_APP_SECRET) || clean(process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET);

  let REDIRECT_URI = clean(process.env.INSTAGRAM_REDIRECT_URI) || clean(process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI) || "";
  if (!REDIRECT_URI || !REDIRECT_URI.includes("/api/auth/instagram")) {
    const base = clean(process.env.NEXT_PUBLIC_BASE_URL) || `http://localhost:3000`;
    REDIRECT_URI = `${base.replace(/\/$/, "")}/api/auth/instagram/callback`;
  }

  if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
    return respondWithPostMessage({ success: false, error: "Server not configured: missing Instagram app credentials", state });
  }

  async function fetchInsightsWithFallback(mediaId: string, candidateMetricSets: string[][], accessToken: string) {
    for (const metricArr of candidateMetricSets) {
      const metricStr = metricArr.join(",");
      try {
        const resp = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}/insights`, {
          params: { access_token: accessToken, metric: metricStr }
        });
        const metrics = resp.data?.data || [];
        const map: Record<string, number> = {};
        for (const it of metrics) {
          map[it.name] = Array.isArray(it.values) && it.values[0] ? it.values[0].value : 0;
        }
        return { metricMap: map, usedMetrics: metricStr };
      } catch (err: any) {
        console.warn(`Insights fallback error for ${mediaId} metrics=${metricStr}:`, err?.response?.data || err?.message || err);
      }
    }
    throw new Error(`No workable insights metric set for media ${mediaId}`);
  }

  try {
    // 1) short-lived token
    const tokenResp = await axios.get("https://graph.facebook.com/v17.0/oauth/access_token", {
      params: { client_id: APP_ID, redirect_uri: REDIRECT_URI, client_secret: APP_SECRET, code }
    });
    const shortLivedToken = tokenResp.data?.access_token;

    // 2) long-lived token
    const longResp = await axios.get("https://graph.facebook.com/v17.0/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: shortLivedToken,
      }
    });
    const accessToken = longResp.data?.access_token || shortLivedToken;

    // 3) IG user ID from Pages
    const pagesResp = await axios.get("https://graph.facebook.com/v17.0/me/accounts", {
      params: { access_token: accessToken, fields: "id,name,instagram_business_account" }
    });
    const pages = pagesResp.data?.data || [];
    let igUserId: string | null = null;
    for (const p of pages) {
      if (p.instagram_business_account?.id) { igUserId = p.instagram_business_account.id; break; }
    }
    if (!igUserId) {
      return respondWithPostMessage({
        success: false,
        error: "No Instagram Business/Creator account found linked to your Facebook Pages.",
        state
      });
    }

    // 4) Profile info
    const profileResp = await axios.get(`https://graph.facebook.com/v17.0/${igUserId}`, {
      params: { access_token: accessToken, fields: "username,profile_picture_url,followers_count,name" }
    });
    const profileData = profileResp.data || {};
    const followersCount = profileData.followers_count || 0;

    // 5) Media list
    const mediaResp = await axios.get(`https://graph.facebook.com/v17.0/${igUserId}/media`, {
      params: {
        access_token: accessToken,
        fields: "id,media_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url",
        limit: 50
      }
    });
    const media = mediaResp.data?.data || [];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let reelTotal = 0, reelCount = 0;
    let storyTotal = 0, storyCount = 0;
    let feedTotal = 0, feedCount = 0;
    let likeTotal = 0, commentTotal = 0, postCountInWindow = 0;
    const postTimestamps: Date[] = [];
    const topCandidates: any[] = [];

    const reelCandidates = [["views", "reach", "ig_reels_avg_watch_time"], ["views", "reach"], ["reach"], ["views"]];
    const feedCandidates = [["views", "reach"], ["reach"], ["views"]];
    const storyCandidates = [["reach"]];

    for (const m of media) {
      const ts = m.timestamp ? new Date(m.timestamp) : null;
      if (ts && ts > thirtyDaysAgo) postCountInWindow++;
      if (ts) postTimestamps.push(ts);

      likeTotal += m.like_count || 0;
      commentTotal += m.comments_count || 0;

      let candidateSets = feedCandidates;
      let isReel = false;
      if (m.media_type === "STORY") candidateSets = storyCandidates;
      else if (m.media_type === "VIDEO" && m.permalink?.includes("/reel/")) {
        candidateSets = reelCandidates; isReel = true;
      }

      let insightResult = null;
      try {
        insightResult = await fetchInsightsWithFallback(m.id, candidateSets, accessToken);
      } catch (_) {}

      let reachValue = insightResult?.metricMap["reach"] || 0;
      let viewsValue = insightResult?.metricMap["views"] || insightResult?.metricMap["video_views"] || 0;
      if (!reachValue) reachValue = viewsValue;

      if (isReel) { reelTotal += reachValue; reelCount++; }
      else if (m.media_type === "STORY") { storyTotal += reachValue; storyCount++; }
      else { feedTotal += reachValue; feedCount++; }

      const totalEngagement = (m.like_count || 0) + (m.comments_count || 0);
      topCandidates.push({
        id: m.id,
        permalink: m.permalink,
        likes: m.like_count || 0,
        comments: m.comments_count || 0,
        totalEngagement,
        insights: insightResult?.metricMap ?? null,
        thumbnail: m.thumbnail_url || m.media_url || null

      });
    }

    const avgReelViews = reelCount > 0 ? Math.round(reelTotal / reelCount) : 0;
    const storyAverageViews = storyCount > 0 ? Math.round(storyTotal / storyCount) : 0;
    const avgFeedViews = feedCount > 0 ? Math.round(feedTotal / feedCount) : 0;

    const avgLikes = postCountInWindow > 0 ? Math.round(likeTotal / postCountInWindow) : 0;
    const avgComments = postCountInWindow > 0 ? Math.round(commentTotal / postCountInWindow) : 0;

    const engagementRate = (followersCount > 0 && postCountInWindow > 0)
      ? Math.round(((avgLikes + avgComments) / followersCount) * 100)
      : 0;

    const postsPerMonth = postTimestamps.filter(ts => ts > thirtyDaysAgo).length;
    const postsPerWeek = Math.round(postsPerMonth / 4);

    const topPosts = topCandidates.sort((a, b) => b.totalEngagement - a.totalEngagement).slice(0, 3);

    let accountReach = 0;
    try {
      const reachResp = await axios.get(`https://graph.facebook.com/v17.0/${igUserId}/insights`, {
        params: { access_token: accessToken, metric: "reach", period: "day" }
      });
      const arr = reachResp.data?.data?.[0]?.values || [];
      const last30 = arr.slice(-30);
      accountReach = last30.reduce((s: number, v: any) => s + (v.value || 0), 0);
    } catch (err: any) {
      console.warn("Account reach fetch failed:", err?.response?.data || err?.message || err);
    }

    const result = {
      username: profileData.username || "",
      name: profileData.name || "",
      followers_count: followersCount,
      profile_picture_url: profileData.profile_picture_url || "",
      avgReelViews,
      storyAverageViews,
      avgFeedViews,
      avgLikes,
      avgComments,
      topPosts,
      postsPerWeek,
      postsPerMonth,
      engagementRate,
      accountReach,
      profileUrl: `https://instagram.com/${profileData.username || ""}`,
      state
    };

    console.log("Final profile payload:", result);
    return respondWithPostMessage({ success: true, profile: result, state });

  } catch (err: any) {
    console.error("Instagram OAuth callback error", err?.response?.data || err?.message || err);
    return respondWithPostMessage({
      success: false,
      error: "Failed to complete Instagram OAuth: " + (err?.message || "Unknown error"),
      state
    });
  }
}
