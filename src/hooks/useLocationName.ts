export async function getHumanReadableLocation(
  lat?: number,
  lng?: number
): Promise<string> {
  if (lat == null || lng == null) return "";
  if (Number.isNaN(lat) || Number.isNaN(lng)) return "";

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return `${lat}, ${lng}`;
    }

    const data = await response.json();
    return data?.display_name || `${lat}, ${lng}`;
  } catch {
    return `${lat}, ${lng}`;
  }
}