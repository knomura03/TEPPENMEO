export type QueryValue = string | number | string[] | number[] | null | undefined;

export function buildHrefWithParams(
  basePath: string,
  currentParams: URLSearchParams | Record<string, string | string[] | undefined>,
  patch: Record<string, QueryValue>
) {
  const params = new URLSearchParams();

  if (currentParams instanceof URLSearchParams) {
    currentParams.forEach((value, key) => {
      params.append(key, value);
    });
  } else {
    Object.entries(currentParams).forEach(([key, value]) => {
      if (value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry));
        return;
      }
      params.set(key, value);
    });
  }

  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      params.delete(key);
      return;
    }
    params.delete(key);
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, String(entry)));
      return;
    }
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
