import { ProviderError } from "@/server/providers/errors";
import { ProviderLocation, ProviderReview, ProviderType } from "@/server/providers/types";
import { HttpError, httpRequestJson } from "@/server/utils/http";

type GoogleAccount = {
  name: string;
  accountName?: string;
};

type GoogleAccountListResponse = {
  accounts?: GoogleAccount[];
  nextPageToken?: string;
};

type GoogleAddress = {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  regionCode?: string;
};

type GoogleLatLng = {
  latitude?: number;
  longitude?: number;
};

type GoogleLocation = {
  name: string;
  title?: string;
  storeCode?: string;
  address?: GoogleAddress;
  latlng?: GoogleLatLng;
  metadata?: {
    placeId?: string;
  };
};

type GoogleLocationListResponse = {
  locations?: GoogleLocation[];
  nextPageToken?: string;
};

type GoogleReviewer = {
  displayName?: string;
};

type GoogleReview = {
  reviewId?: string;
  name?: string;
  reviewer?: GoogleReviewer;
  comment?: string;
  starRating?: string | number;
  createTime?: string;
};

type GoogleReviewListResponse = {
  reviews?: GoogleReview[];
  nextPageToken?: string;
};

type GoogleReplyRequest = {
  comment: string;
};

const accountEndpoint =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const businessInfoEndpoint =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
const reviewEndpoint = "https://mybusiness.googleapis.com/v4";

function mapGoogleApiError(error: unknown, fallback: string): ProviderError {
  if (error instanceof HttpError) {
    const status = error.status;
    if (status === 401) {
      return new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "auth_required",
        "認証が無効です。再認可してください。",
        status
      );
    }
    if (status === 403) {
      return new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "auth_required",
        "API承認または権限が不足しています。申請後に再接続してください。",
        status
      );
    }
    if (status === 429) {
      return new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "rate_limited",
        "レート制限に達しました。しばらく待って再実行してください。",
        status
      );
    }
    if (status >= 500) {
      return new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "upstream_error",
        "Google側のエラーが発生しました。時間をおいて再実行してください。",
        status
      );
    }
  }
  return new ProviderError(
    ProviderType.GoogleBusinessProfile,
    "unknown",
    fallback
  );
}

function mapGoogleStarRating(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[value] ?? 0;
}

function formatGoogleAddress(address?: GoogleAddress): string | undefined {
  if (!address) return undefined;
  const parts = [
    ...(address.addressLines ?? []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.regionCode,
  ].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(" ");
}

function extractReviewId(review: GoogleReview): string {
  if (review.reviewId) return review.reviewId;
  if (review.name) {
    const segments = review.name.split("/");
    return segments[segments.length - 1] ?? review.name;
  }
  return "unknown";
}

async function listGoogleAccounts(accessToken: string): Promise<GoogleAccount[]> {
  const accounts: GoogleAccount[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(accountEndpoint);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await httpRequestJson<GoogleAccountListResponse>(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    accounts.push(...(response.accounts ?? []));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return accounts;
}

async function listLocationsForAccount(
  accessToken: string,
  account: GoogleAccount
): Promise<ProviderLocation[]> {
  const locations: ProviderLocation[] = [];
  let pageToken: string | undefined;
  const accountLabel = account.accountName ?? account.name;

  do {
    const url = new URL(
      `${businessInfoEndpoint}/${account.name}/locations`
    );
    url.searchParams.set(
      "readMask",
      "name,title,storeCode,address,metadata,latlng"
    );
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await httpRequestJson<GoogleLocationListResponse>(
      url.toString(),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    (response.locations ?? []).forEach((location) => {
      locations.push({
        id: location.name,
        name: location.title ?? location.name,
        address: formatGoogleAddress(location.address),
        lat: location.latlng?.latitude,
        lng: location.latlng?.longitude,
        metadata: {
          account_name: accountLabel,
          account_resource: account.name,
          store_code: location.storeCode ?? null,
          place_id: location.metadata?.placeId ?? null,
        },
      });
    });

    pageToken = response.nextPageToken;
  } while (pageToken);

  return locations;
}

export async function listGoogleLocations(
  accessToken: string
): Promise<ProviderLocation[]> {
  try {
    const accounts = await listGoogleAccounts(accessToken);
    const results: ProviderLocation[] = [];
    for (const account of accounts) {
      results.push(...(await listLocationsForAccount(accessToken, account)));
    }
    return results;
  } catch (error) {
    throw mapGoogleApiError(error, "GBPロケーションの取得に失敗しました。");
  }
}

export async function listGoogleReviews(
  accessToken: string,
  locationName: string
): Promise<ProviderReview[]> {
  try {
    const reviews: ProviderReview[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${reviewEndpoint}/${locationName}/reviews`);
      url.searchParams.set("pageSize", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await httpRequestJson<GoogleReviewListResponse>(
        url.toString(),
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      (response.reviews ?? []).forEach((review) => {
        reviews.push({
          id: extractReviewId(review),
          rating: mapGoogleStarRating(review.starRating),
          author: review.reviewer?.displayName ?? null,
          comment: review.comment ?? null,
          createdAt: review.createTime ?? new Date().toISOString(),
        });
      });

      pageToken = response.nextPageToken;
    } while (pageToken);

    return reviews;
  } catch (error) {
    throw mapGoogleApiError(error, "GBPレビューの取得に失敗しました。");
  }
}

export async function replyGoogleReview(
  accessToken: string,
  locationName: string,
  reviewId: string,
  reply: string
): Promise<void> {
  try {
    await httpRequestJson(
      `${reviewEndpoint}/${locationName}/reviews/${reviewId}/reply`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ comment: reply } satisfies GoogleReplyRequest),
      }
    );
  } catch (error) {
    throw mapGoogleApiError(error, "GBPレビュー返信に失敗しました。");
  }
}
