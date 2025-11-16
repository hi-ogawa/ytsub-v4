# YouTube API Workarounds

## Overview

This extension fetches video metadata and captions directly from YouTube without using the official YouTube Data API. This approach is necessary because:

1. **No API Key Required**: The official YouTube Data API requires API keys with quotas and rate limits
2. **Better User Experience**: No setup required - the extension works immediately after installation
3. **Access to More Data**: Can access internal YouTube player data that may not be available via the official API

However, this approach requires workarounds to bypass YouTube's bot detection and access restrictions.

## Workaround Details

### 1. Fetching Video Metadata

**Endpoint**: `https://www.youtube.com/youtubei/v1/player`

**Challenge**: YouTube's internal API requires proper client identification and visitor tracking to prevent automated access.

**Solution**: Impersonate an iOS YouTube client with complete device and client information.

**Implementation** (from `src/utils/youtube.ts`):

```typescript
export async function fetchMetadataJson(
  videoId: string,
): Promise<VideoMetadata> {
  const visitor_data = await getVisitorData(videoId);
  const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: "IOS",
          clientVersion: "20.10.4",
          deviceMake: "Apple",
          deviceModel: "iPhone16,2",
          userAgent: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
          osName: "iPhone",
          osVersion: "18.3.2.22D82",
          hl: "en",
          timeZokne: "UTC",
          utcOffsetMinutes: 0,
        },
      },
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: "HTML5_PREF_WANTS",
          signatureTimestamp: 20073,
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    headers: {
      "X-YouTube-Client-Name": "5",
      "X-YouTube-Client-Version": "20.10.4",
      Origin: "https://www.youtube.com",
      "User-Agent": "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
      "content-type": "application/json",
      "X-Goog-Visitor-Id": visitor_data,
    },
  });
  return await res.json();
}
```

**Key Components**:

1. **Client Spoofing**: Pretends to be iOS YouTube app version 20.10.4
2. **Device Information**: Provides complete Apple device details (iPhone16,2)
3. **Visitor Data**: Includes YouTube visitor tracking ID (see next section)
4. **Headers**: Proper headers matching the iOS client

### 2. Obtaining Visitor Data

**Challenge**: YouTube requires a valid `X-Goog-Visitor-Id` header to track sessions and prevent abuse.

**Solution**: Scrape the visitor data from the YouTube watch page before making API calls.

**Implementation**:

```typescript
async function getVisitorData(videoId: string) {
  // Fetch the YouTube watch page
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch YouTube page");
  }
  const webpage = await res.text();
  
  // Extract ytcfg configuration from page
  const ytcfg = extract_ytcfg(webpage);
  
  // Extract visitor data from ytcfg
  const visitorData = extract_visitor_data(ytcfg);
  if (!visitorData) {
    throw new Error("Visitor data not found in ytcfg");
  }
  return visitorData;
}
```

**Extraction Logic** (ported from [yt-dlp](https://github.com/yt-dlp/yt-dlp)):

```typescript
function extract_ytcfg(webpage: string): Record<string, any> {
  // Find ytcfg.set(...) call in page HTML
  const match = webpage.match(/ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/);
  if (match) {
    return JSON.parse(match[1]!);
  }
  throw new Error("ytcfg not found in webpage");
}

function extract_visitor_data(ytcfg: any): string | undefined {
  // Try multiple possible locations for visitor data
  if (ytcfg && ytcfg.VISITOR_DATA) {
    return ytcfg.VISITOR_DATA;
  }
  if (ytcfg && ytcfg.INNERTUBE_CONTEXT && ytcfg.INNERTUBE_CONTEXT.client) {
    return ytcfg.INNERTUBE_CONTEXT.client.visitorData;
  }
  if (ytcfg && ytcfg.responseContext && ytcfg.responseContext.visitorData) {
    return ytcfg.responseContext.visitorData;
  }
}
```

This approach:
1. Downloads the YouTube watch page HTML
2. Finds the `ytcfg.set()` JavaScript call embedded in the page
3. Parses the JSON configuration object
4. Extracts the visitor data from multiple possible locations

### 3. Fetching Caption Data

**Endpoint**: Caption track URLs from metadata (format: `json3`)

**Challenge**: Caption URLs are provided in the metadata but need proper formatting.

**Solution**: Use the `json3` format parameter which provides structured caption data.

**Implementation**:

```typescript
export async function fetchCaptionTrack(
  captionTrackMetadata: CaptionTrackMetadata,
): Promise<CaptionTrackJson3> {
  const url = new URL(captionTrackMetadata.baseUrl);
  url.searchParams.set("fmt", "json3");  // Request JSON3 format
  const res = await fetch(url);
  tinyassert(res.ok);
  return res.json();
}
```

**Caption Data Structure**:

```typescript
interface CaptionTrackJson3 {
  events: {
    tStartMs: number;      // Start time in milliseconds
    dDurationMs: number;   // Duration in milliseconds
    segs: {
      utf8: string;        // Text segment
    }[];
  }[];
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fetch Video Metadata                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Get Visitor Data                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET https://www.youtube.com/watch?v={videoId}             │ │
│  │  ↓                                                          │ │
│  │ Parse HTML to find ytcfg.set({...})                        │ │
│  │  ↓                                                          │ │
│  │ Extract VISITOR_DATA from ytcfg                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Fetch Player Metadata                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ POST https://www.youtube.com/youtubei/v1/player           │ │
│  │                                                             │ │
│  │ Headers:                                                    │ │
│  │   X-Goog-Visitor-Id: {visitor_data}                        │ │
│  │   X-YouTube-Client-Name: 5                                 │ │
│  │   X-YouTube-Client-Version: 20.10.4                        │ │
│  │   User-Agent: com.google.ios.youtube/...                   │ │
│  │                                                             │ │
│  │ Body:                                                       │ │
│  │   videoId: {videoId}                                       │ │
│  │   context.client: {iOS device info}                        │ │
│  │   playbackContext: {...}                                   │ │
│  │  ↓                                                          │ │
│  │ Returns: VideoMetadata with caption tracks                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Fetch Caption Tracks                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET {captionTrack.baseUrl}?fmt=json3                       │ │
│  │  ↓                                                          │ │
│  │ Returns: Timestamped caption events                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Credits and References

This implementation is based on techniques from [yt-dlp](https://github.com/yt-dlp/yt-dlp), a command-line program to download videos from YouTube and other sites.

**Specific references**:

1. **iOS Client Configuration**:
   - [yt-dlp base client config](https://github.com/yt-dlp/yt-dlp/blob/a7113722ec33f30fc898caee9242af2b82188a53/yt_dlp/extractor/youtube/_base.py#L42)

2. **Visitor Data Extraction**:
   - [yt-dlp visitor data extraction](https://github.com/yt-dlp/yt-dlp/blob/a7113722ec33f30fc898caee9242af2b82188a53/yt_dlp/extractor/youtube/_base.py#L739-L745)

## Maintenance Notes

### Potential Breaking Changes

This workaround relies on YouTube's internal APIs and page structure, which can change without notice. Potential failure points:

1. **Client Version**: YouTube may block old client versions (currently using 20.10.4)
2. **Visitor Data Format**: The `ytcfg.set()` structure or visitor data location may change
3. **API Endpoint**: The `/youtubei/v1/player` endpoint could be modified or deprecated
4. **Caption Format**: The `json3` format could be changed or removed

### Update Strategy

When the workaround breaks:

1. **Check yt-dlp Updates**: Look for recent changes in the yt-dlp repository
2. **Update Client Version**: Bump iOS client version to a more recent one
3. **Verify Headers**: Ensure headers match current iOS YouTube app
4. **Test Visitor Data**: Verify visitor data extraction still works
5. **Monitor Errors**: Check extension error logs for API failures

### Testing

To verify the workaround is working:

```typescript
// Test visitor data extraction
const visitorData = await getVisitorData("dQw4w9WgXcQ");
console.log("Visitor data:", visitorData);

// Test metadata fetching
const metadata = await fetchMetadataJson("dQw4w9WgXcQ");
console.log("Video title:", metadata.videoDetails.title);
console.log("Caption tracks:", metadata.captions?.playerCaptionsTracklistRenderer.captionTracks);

// Test caption fetching
if (metadata.captions) {
  const track = metadata.captions.playerCaptionsTracklistRenderer.captionTracks[0];
  if (track) {
    const captions = await fetchCaptionTrack(track);
    console.log("First caption event:", captions.events[0]);
  }
}
```

## Alternative Approaches Considered

### 1. Official YouTube Data API v3

**Pros**:
- Stable and officially supported
- Well-documented
- Guaranteed uptime

**Cons**:
- Requires API key setup
- Has quota limits (10,000 units/day default)
- Doesn't provide caption data in the same detail
- Would require users to configure their own API keys

**Verdict**: Not chosen due to poor user experience and quota limitations.

### 2. YouTube Embed API

**Pros**:
- No authentication required
- Officially supported for embeds

**Cons**:
- Limited metadata access
- No caption data available
- Not suitable for content scripts

**Verdict**: Not suitable for this use case.

### 3. Browser Extension YouTube API

**Pros**:
- Some extensions have special permissions

**Cons**:
- No such API exists for general caption access
- Would still require authentication

**Verdict**: Not available.

## Legal and Ethical Considerations

This extension:
- ✅ Does not download or redistribute content
- ✅ Only accesses data already visible to the user
- ✅ Does not bypass any payment or subscription requirements
- ✅ Does not abuse YouTube's services (reasonable rate limiting)
- ✅ Enhances user experience without harming YouTube

The workarounds are used solely to provide better subtitle viewing experience for users who are already watching videos on YouTube.

## Troubleshooting

### Error: "Failed to fetch YouTube page"

**Cause**: Network error or YouTube is blocking the request.

**Solution**: 
- Check network connectivity
- Verify the video URL is correct
- Check if YouTube is accessible

### Error: "ytcfg not found in webpage"

**Cause**: YouTube changed their page structure.

**Solution**:
- Check yt-dlp for updates to the extraction logic
- Update the regex pattern to match new structure
- May need to find alternative data source

### Error: "Visitor data not found in ytcfg"

**Cause**: YouTube changed where they store visitor data.

**Solution**:
- Add additional extraction locations in `extract_visitor_data()`
- Check yt-dlp for updated extraction logic

### API Returns Error or Empty Data

**Cause**: Client version is outdated or blocked.

**Solution**:
- Update `clientVersion` to a more recent version
- Update `signatureTimestamp` if necessary
- Verify all headers match current iOS app

---

**Last Updated**: 2025-11-16  
**Version**: 1.0  
**Maintenance**: Check yt-dlp repository quarterly for updates
