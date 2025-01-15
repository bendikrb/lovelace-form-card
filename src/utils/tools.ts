export async function applyToStrings(
  obj: any,
  callback: (value: string) => Promise<string>
): Promise<any> {
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
  const a =
    "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìıİłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·";
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

const TIMEOUT_ERROR = "SELECTTREE-TIMEOUT";

export async function await_element(el, hard = false) {
  if (el.localName?.includes("-"))
    await customElements.whenDefined(el.localName);
  if (el.updateComplete) await el.updateComplete;
  if (hard) {
    if (el.pageRendered) await el.pageRendered;
    if (el._panelState) {
      let rounds = 0;
      while (el._panelState !== "loaded" && rounds++ < 5)
        await new Promise((r) => setTimeout(r, 100));
    }
  }
}

async function _selectTree(root, path, all = false) {
  let el = [root];
  if (typeof path === "string") {
    path = path.split(/(\$| )/);
  }
  while (path[path.length - 1] === "") path.pop();
  for (const [_i, p] of path.entries()) {
    const e = el[0];
    if (!e) return null;

    if (!p.trim().length) continue;

    await await_element(e);
    el = p === "$" ? [e.shadowRoot] : e.querySelectorAll(p);
  }
  return all ? el : el[0];
}

export async function selectTree(root, path, all = false, timeout = 10000) {
  return Promise.race([
    _selectTree(root, path, all),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(TIMEOUT_ERROR)), timeout)
    ),
  ]).catch((err) => {
    if (!err.message || err.message !== TIMEOUT_ERROR) throw err;
    return null;
  });
}

export async function waitRepeat(fn, times, delay) {
  while (times--) {
    await fn();
    await new Promise((r) => setTimeout(r, delay));
  }
}
