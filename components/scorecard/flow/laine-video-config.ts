// The one switch for Laine's intro clip. While VIDEO_SRC is empty, the
// landing form card shows the five-pillar radar preview and the below-fold
// "Why we built this audit" section shows the coming-soon poster. The moment
// a real clip lands (drop it in public/assets/videos/ and set VIDEO_SRC,
// ideally with a real poster frame from the shoot), the video REPLACES the
// radar at the top of the form card and the below-fold section disappears.
// Nothing else needs touching. Client-safe: constants only.
export const LAINE_VIDEO_SRC = "";
export const LAINE_VIDEO_POSTER = "/assets/images/laine-p-500.png";
