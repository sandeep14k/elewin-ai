import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { platform, handle, verificationCode } = await req.json();

    if (!platform || !handle) {
      return NextResponse.json({ error: "Missing platform or handle" }, { status: 400 });
    }

    let stats = null;
    let profileText = "";

    // 1. Fetch Stats & Profile Text based on platform
    if (platform === "leetcode") {
      stats = await fetchLeetCodeStats(handle);
      if (!stats) return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
      profileText = `${stats.rawProfile.aboutMe || ''} ${stats.rawProfile.realName || ''}`;
    } 
    else if (platform === "codeforces") {
      stats = await fetchCodeforcesStats(handle);
      if (!stats) return NextResponse.json({ error: "Codeforces user not found" }, { status: 404 });
      profileText = `${stats.rawProfile.firstName || ''} ${stats.rawProfile.lastName || ''} ${stats.rawProfile.city || ''} ${stats.rawProfile.organization || ''}`;
    }
    else {
      return NextResponse.json({ error: "Unsupported platform or API not yet implemented" }, { status: 400 });
    }

    // 2. SECURE OWNERSHIP VERIFICATION
    if (verificationCode) {
      if (!profileText.includes(verificationCode)) {
        return NextResponse.json({ 
          error: `Verification code '${verificationCode}' not found in profile. Please save it to your About/City section and try again.` 
        }, { status: 403 });
      }
    }

    // 3. Clean up raw profile data before sending to frontend
    delete stats.rawProfile;

    return NextResponse.json({ success: true, platform, handle, data: stats });

  } catch (error: any) {
    console.error(`[CODING STATS ERROR]`, error);
    return NextResponse.json({ error: "Failed to fetch stats", details: error.message }, { status: 500 });
  }
}

// --- LEETCODE GRAPHQL FETCHER ---
async function fetchLeetCodeStats(username: string) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats: submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
        profile { ranking reputation aboutMe realName }
      }
      userContestRanking(username: $username) { rating globalRanking }
    }
  `;

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com" },
    body: JSON.stringify({ query, variables: { username } })
  });

  const data = await res.json();
  if (data.errors || !data.data?.matchedUser) return null;

  const submissions = data.data.matchedUser.submitStats.acSubmissionNum;
  const totalSolved = submissions.find((s: any) => s.difficulty === "All")?.count || 0;
  const hardSolved = submissions.find((s: any) => s.difficulty === "Hard")?.count || 0;
  
  return {
    totalSolved,
    hardSolved,
    ranking: data.data.matchedUser.profile.ranking,
    contestRating: Math.round(data.data.userContestRanking?.rating || 0),
    rawProfile: data.data.matchedUser.profile // Passed temporarily for verification
  };
}

// --- CODEFORCES REST FETCHER ---
async function fetchCodeforcesStats(handle: string) {
  const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
  const json = await res.json();
  
  if (json.status !== "OK" || !json.result || json.result.length === 0) return null;
  
  const user = json.result[0];
  return {
    rating: user.rating || 0,
    maxRating: user.maxRating || 0,
    rank: user.rank || "Unrated",
    contribution: user.contribution || 0,
    rawProfile: user // Passed temporarily for verification
  };
}