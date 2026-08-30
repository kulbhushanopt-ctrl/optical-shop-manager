// The Contact Picker API lets a page ask the browser to show the phone's
// own native contacts list and hand back just the entry the user taps --
// no broad "read all contacts" permission, no server involved. Only
// Android Chrome (and other Chromium-based mobile browsers) implement it
// today; isContactPickerSupported() lets callers hide the button entirely
// everywhere else instead of showing something that would just fail.
export function isContactPickerSupported() {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

// Returns { name, phone } for the picked contact, or null if the user
// cancelled the picker (or it's unsupported/denied) -- callers should treat
// null as "do nothing" rather than an error.
export async function pickContact() {
  if (!isContactPickerSupported()) return null;
  try {
    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
    const contact = contacts?.[0];
    if (!contact) return null;
    return {
      name: contact.name?.[0] || "",
      phone: contact.tel?.[0] || "",
    };
  } catch {
    return null;
  }
}
