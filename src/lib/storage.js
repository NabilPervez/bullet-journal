export async function loadList(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`localStorage read('${key}') failed`, err);
    return [];
  }
}

export async function saveList(key, list) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error(`localStorage write('${key}') failed`, err);
    return false;
  }
}
