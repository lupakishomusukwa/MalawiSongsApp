


import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type DownloadedSong = {
  songId: string;
  title: string;
  artistName: string;
  localUri: string;
  downloadedAt: string;
};

const ROOT = FileSystem.documentDirectory;

if (!ROOT) {
  throw new Error("App document storage is unavailable.");
}

const DOWNLOAD_DIR = `${ROOT}malawisongs-downloads/`;
const INDEX_FILE = `${DOWNLOAD_DIR}downloads.json`;

// Create the folder used to store downloaded songs.
async function ensureDownloadFolder(): Promise<void> {
  const folder = await FileSystem.getInfoAsync(DOWNLOAD_DIR);

  if (!folder.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, {
      intermediates: true,
    });
  }
}

// Read the saved download library.
async function readLibrary(): Promise<DownloadedSong[]> {
  await ensureDownloadFolder();

  const info = await FileSystem.getInfoAsync(INDEX_FILE);

  if (!info.exists) {
    return [];
  }

  try {
    const contents = await FileSystem.readAsStringAsync(INDEX_FILE);
    return JSON.parse(contents) as DownloadedSong[];
  } catch {
    return [];
  }
}

// Save the download library.
async function writeLibrary(songs: DownloadedSong[]): Promise<void> {
  await ensureDownloadFolder();

  await FileSystem.writeAsStringAsync(
    INDEX_FILE,
    JSON.stringify(songs)
  );
}

// Create safe filenames.
function safeFileName(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60) || "song"
  );
}

// Detect the audio format from the URL.
function getExtension(url: string): string {
  let pathname: string;

  try {
    pathname = new URL(url).pathname;
  } catch {
    throw new Error("The audio URL is invalid.");
  }

  const match = pathname.match(
    /\.(mp3|m4a|aac|wav|ogg|flac)$/i
  );

  if (!match) {
    throw new Error(
      "Cannot determine the audio format. Confirm the official audio URL."
    );
  }

  return match[1].toLowerCase();
}

// Get downloaded songs and remove missing files from the library.
export async function getDownloadedSongs(): Promise<DownloadedSong[]> {
  const songs = await readLibrary();
  const existing: DownloadedSong[] = [];

  for (const song of songs) {
    const info = await FileSystem.getInfoAsync(song.localUri);

    if (info.exists) {
      existing.push(song);
    }
  }

  if (existing.length !== songs.length) {
    await writeLibrary(existing);
  }

  return existing;
}

// Download a song using its authorized audio URL.
export async function downloadSong(
  song: {
    song_id: string;
    title: string;
    artist_name: string;
  },
  audioUrl: string
): Promise<DownloadedSong> {
  if (!audioUrl || !/^https:\/\//i.test(audioUrl)) {
    throw new Error(
      "A valid authorized HTTPS audio URL is required."
    );
  }

  const extension = getExtension(audioUrl);
  await ensureDownloadFolder();

  const library = await getDownloadedSongs();

  const existing = library.find(
    (item) => item.songId === song.song_id
  );

  if (existing) {
    return existing;
  }

  const fileName =
    `${safeFileName(song.song_id)}_` +
    `${safeFileName(song.title)}.${extension}`;

  const localUri = `${DOWNLOAD_DIR}${fileName}`;

  const result = await FileSystem.downloadAsync(
    audioUrl,
    localUri
  );

  const downloaded: DownloadedSong = {
    songId: song.song_id,
    title: song.title,
    artistName: song.artist_name,
    localUri: result.uri,
    downloadedAt: new Date().toISOString(),
  };

  await writeLibrary([...library, downloaded]);

  return downloaded;
}

// Delete a downloaded song from storage and the library.
export async function removeDownloadedSong(
  songId: string
): Promise<void> {
  const library = await readLibrary();

  const target = library.find(
    (song) => song.songId === songId
  );

  if (target) {
    const info = await FileSystem.getInfoAsync(target.localUri);

    if (info.exists) {
      await FileSystem.deleteAsync(target.localUri);
    }
  }

  await writeLibrary(
    library.filter((song) => song.songId !== songId)
  );
}

// Open the sharing menu for a downloaded audio file.
export async function saveAudioToPhone(
  localUri: string
): Promise<void> {
  const info = await FileSystem.getInfoAsync(localUri);

  if (!info.exists) {
    throw new Error("The downloaded audio file could not be found.");
  }

  const available = await Sharing.isAvailableAsync();

  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(localUri, {
    dialogTitle: "Save or share downloaded song",
  });
}
