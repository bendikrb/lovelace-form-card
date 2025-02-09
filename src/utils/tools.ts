export async function applyToStrings(obj: any, callback: (value: string) => Promise<string>): Promise<any> {
  const result: any = {};

  for (const key in obj) {
    if (typeof obj[key] === "string") {
      result[key] = await callback(obj[key]);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      result[key] = await applyToStrings(obj[key], callback);
    } else {
      result[key] = obj[key];
    }
  }

  return result;
}

// https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
export const slugify = (value: string, delimiter = "_") => {
  const a = "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìıİłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·";
  const b = `aaaaaaaaaacccddeeeeeeeegghiiiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz${delimiter}`;
  const p = new RegExp(a.split("").join("|"), "g");

  let slugified: string;

  if (value === "") {
    slugified = "";
  } else {
    slugified = value
      .toString()
      .toLowerCase()
      .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/(\d),(?=\d)/g, "$1") // Remove Commas between numbers
      .replace(/[^a-z0-9]+/g, delimiter) // Replace all non-word characters
      .replace(new RegExp(`(${delimiter})\\1+`, "g"), "$1") // Replace multiple delimiters with single delimiter
      .replace(new RegExp(`^${delimiter}+`), "") // Trim delimiter from start of text
      .replace(new RegExp(`${delimiter}+$`), ""); // Trim delimiter from end of text

    if (slugified === "") {
      slugified = "unknown";
    }
  }
  return slugified;
};

export async function await_element(el: any, hard = false) {
  if (el.localName?.includes("-")) await customElements.whenDefined(el.localName);
  if (el.updateComplete) await el.updateComplete;
  if (hard) {
    if (el.pageRendered) await el.pageRendered;
    if (el._panelState) {
      let rounds = 0;
      while (el._panelState !== "loaded" && rounds++ < 5) await new Promise((r) => setTimeout(r, 100));
    }
  }
}

export async function waitRepeat(fn: () => any, times: number, delay: number) {
  while (times--) {
    await fn();
    await new Promise((r) => setTimeout(r, delay));
  }
}

export function reorderRecord<T>(record: Record<string, T>, oldIndex: number, newIndex: number): Record<string, T> {
  const newRecord = structuredClone(record);
  const keys = Object.keys(newRecord);
  if (oldIndex < 0 || oldIndex >= keys.length || newIndex < 0 || newIndex >= keys.length) {
    throw new Error("Index out of bounds");
  }

  // Remove the key at oldIndex
  const [movedKey] = keys.splice(oldIndex, 1);
  // Insert the key at newIndex
  keys.splice(newIndex, 0, movedKey);

  // Create a new record with reordered keys
  const reorderedRecord: Record<string, T> = {};
  for (const key of keys) {
    reorderedRecord[key] = newRecord[key];
  }

  return reorderedRecord;
}

export function getValue(path: string, obj: any) {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}
