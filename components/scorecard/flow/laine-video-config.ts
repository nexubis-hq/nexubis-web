// The one switch for Laine's intro clip. While VIDEO_SRC is empty, the
// landing form card shows the five-pillar radar preview and the below-fold
// "Why we built this audit" section shows the coming-soon poster. The moment
// a real clip lands (drop it in public/assets/videos/ and set VIDEO_SRC),
// the video REPLACES the radar at the top of the form card and the below-fold
// section disappears. Nothing else needs touching. Client-safe: constants only.
//
// The clip is a web-optimized 720p transcode (H.264 MP4 with faststart, so it
// plays as it loads; VP9 WebM for browsers that take it) made from the raw
// upload with ffmpeg. Poster is the supplied thumbnail, recompressed.
export const LAINE_VIDEO_SRC = "/assets/videos/laine-intro-transcode.mp4";
export const LAINE_VIDEO_SRC_WEBM = "/assets/videos/laine-intro-transcode.webm";
export const LAINE_VIDEO_POSTER = "/assets/videos/laine-intro-poster.jpg";
