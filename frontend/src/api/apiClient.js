// Base API client connecting to RISKOS backend at http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TOKEN_KEY = 'riskos_jwt_token';
const USER_KEY = 'riskos_user_info';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export class ApiError extends Error {
  constructor(message, code, path, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.path = path;
    this.details = details;
  }
}

/**
 * Standard request wrapper with JWT attachment and error envelope unpacking
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Backend returns {"error": {"code": ..., "message": "...", "path": "..."}} or {"detail": "..."}
      const errObj = data.error || {};
      const errorMessage =
        errObj.message || data.detail || `Request failed with status ${response.status}`;
      const errorCode = errObj.code || response.status;
      const errorPath = errObj.path || endpoint;
      const errorDetails = errObj.details || null;

      throw new ApiError(errorMessage, errorCode, errorPath, errorDetails);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or parser error
    throw new ApiError(
      error.message || 'Network connection failed. Ensure backend is running at http://localhost:8000',
      0,
      endpoint
    );
  }
}

/* ========================================================================= */
/* API METHODS PER SCREEN                                                    */
/* ========================================================================= */

// 1. Authentication
export async function loginApi(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token) {
    setStoredToken(data.access_token);
  }
  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
}

export async function getCurrentUserApi() {
  return apiRequest('/api/auth/me');
}

// 2. Live Attack Map / Dashboard
export async function getLiveAttackMapApi() {
  return apiRequest('/api/dashboard/live-attack-map');
}

export async function getActiveCampaignsApi() {
  return apiRequest('/api/campaigns/active');
}

export async function getDashboardSummaryApi() {
  return apiRequest('/api/dashboard/summary');
}

export async function getLiveActivityFeedApi(limit = 20) {
  return apiRequest(`/api/dashboard/live?limit=${limit}`);
}

// 3. Campaign Detail
export async function getCampaignDetailApi(campaignId) {
  return apiRequest(`/api/campaigns/${campaignId}`);
}

export async function getCampaignCounterfactualApi(campaignId) {
  return apiRequest(`/api/campaigns/${campaignId}/counterfactual`, {
    method: 'POST',
  });
}

export async function containCampaignApi(campaignId, policy = 'contain', analystName = 'Senior Analyst Vikram', note = '') {
  return apiRequest(`/api/campaigns/${campaignId}/contain`, {
    method: 'POST',
    body: JSON.stringify({
      policy,
      analyst_name: analystName,
      note: note || 'Coordinated containment executed from RISKOS console.',
    }),
  });
}

export async function verifyCampaignApi(campaignId, analystName = 'Senior Analyst Vikram', note = '') {
  return apiRequest(`/api/campaigns/${campaignId}/verify`, {
    method: 'POST',
    body: JSON.stringify({
      analyst_name: analystName,
      note: note || 'Step-up verification challenge enforced across cluster.',
    }),
  });
}

// 4. Transaction Investigation & Entity Graph
export async function getInvestigationDetailApi(investigationId) {
  return apiRequest(`/api/investigations/${investigationId}`);
}

export async function getEntityGraphApi(customerId) {
  return apiRequest(`/api/graph/${customerId}`);
}

export async function getTransactionCounterfactualApi(transactionId, amountPaise = 12500000, riskScore = 77.87) {
  return apiRequest('/api/counterfactual', {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: transactionId,
      amount: amountPaise,
      risk_score: riskScore,
    }),
  });
}

export async function submitReviewDecisionApi(investigationId, decision = 'approve', rationale = '', analystNotes = '') {
  return apiRequest(`/api/reviews/${investigationId}`, {
    method: 'POST',
    body: JSON.stringify({
      decision,
      rationale,
      analyst_notes: analystNotes,
    }),
  });
}

// 5. Review Queue
export async function getPendingReviewsApi() {
  return apiRequest('/api/reviews/pending');
}

// 6. Model Health & Metrics
export async function getModelHealthApi() {
  return apiRequest('/api/model/health');
}

export async function getCampaignMetricsApi() {
  return apiRequest('/api/campaigns/metrics');
}
