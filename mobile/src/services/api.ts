import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, LocationRule } from '../../../shared/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.8:3000';

class ApiService {
  private async getToken(): Promise<string | null> {
    return AsyncStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getToken();
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;
    
    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          // Only set JSON content-type if not sending multipart FormData.
          ...(!isFormData && { 'Content-Type': 'application/json' }),
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Request failed');
      }

      // Handle empty responses (e.g., DELETE requests that return 204 No Content or empty body)
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // If status is 204 No Content, return empty object
      if (response.status === 204) {
        return {} as T;
      }
      
      // If content-length is 0, return empty object
      if (contentLength === '0') {
        return {} as T;
      }

      // Try to read response as text first to check if it's empty
      const text = await response.text();
      
      // If response body is empty, return empty object
      if (!text || text.trim() === '') {
        return {} as T;
      }
      
      // If content-type is not JSON, return empty object (or we could return text, but for API consistency, return empty)
      if (contentType && !contentType.includes('application/json')) {
        return {} as T;
      }
      
      // Parse JSON from text
      try {
        return JSON.parse(text);
      } catch (parseError) {
        // If JSON parsing fails, return empty object
        return {} as T;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Provide better error message for timeouts
      if (error?.name === 'AbortError') {
        throw new Error(`Request timed out. The backend server at ${API_BASE_URL} is not responding. Please ensure:\n1. The backend server is running (npm run start:dev in backend directory)\n2. The server is accessible at ${API_BASE_URL}\n3. Your firewall allows connections on port 3000`);
      }
      
      // Provide better error message for network errors
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure:\n1. The backend server is running\n2. The IP address is correct\n3. Your device and computer are on the same network`);
      }
      
      throw error;
    }
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem('auth_token', response.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    return response;
  }

  async register(email: string, password: string, name: string, phoneNumber?: string) {
    const response = await this.request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, phoneNumber }),
    });
    await AsyncStorage.setItem('auth_token', response.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    return response;
  }

  async logout() {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(data: { name?: string; currency?: string }) {
    const response = await this.request<any>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    // Update stored user data
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      Object.assign(user, data);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    return response;
  }

  async googleLogin(idToken: string) {
    const response = await this.request<{ access_token: string; user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    await AsyncStorage.setItem('auth_token', response.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    return response;
  }

  async appleLogin(data: {
    identityToken: string;
    userIdentifier: string;
    email?: string;
    fullName?: string;
  }) {
    const response = await this.request<{ access_token: string; user: any }>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await AsyncStorage.setItem('auth_token', response.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    return response;
  }

  // Expenses
  async getExpenses(params?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>),
    ).toString();
    
    return this.request(`/expenses?${queryString}`);
  }

  async reconvertExpenses() {
    return this.request<{ converted: number; failed: number }>('/expenses/reconvert', {
      method: 'POST',
    });
  }

  async createExpense(expense: any) {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  async getExpense(id: string) {
    return this.request<Expense>(`/expenses/${id}`);
  }

  async updateExpense(id: string, expense: any) {
    return this.request(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(expense),
    });
  }

  async deleteExpense(id: string) {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  async getExpenseStats(startDate?: string, endDate?: string) {
    const queryString = new URLSearchParams(
      Object.entries({ startDate, endDate }).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
    ).toString();
    
    return this.request(`/expenses/stats?${queryString}`);
  }

  // Voice
  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/m4a') {
    return this.request<{ transcript: string }>('/voice/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioBase64, mimeType }),
    });
  }

  async transcribeAudioFile(fileUri: string, mimeType: string = 'audio/m4a') {
    const formData = new FormData();
    formData.append('audio', {
      uri: fileUri,
      name: `voice-${Date.now()}.m4a`,
      type: mimeType,
    } as any);

    return this.request<{ transcript: string }>('/voice/transcribe-file', {
      method: 'POST',
      body: formData as any,
    });
  }

  async processVoice(transcript: string) {
    return this.request('/voice/process', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  async processVoiceFile(fileUri: string, mimeType: string = 'audio/m4a') {
    const formData = new FormData();
    formData.append('audio', {
      uri: fileUri,
      name: `voice-${Date.now()}.m4a`,
      type: mimeType,
    } as any);

    return this.request<{ expenses: any[] }>('/voice/process-file', {
      method: 'POST',
      body: formData as any,
    });
  }

  // Receipts - Optimized version (base64, no file upload)
  async extractReceiptTextFromBase64(base64Image: string) {
    const result = await this.request<{ text: string }>('/receipts/extract-text', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: base64Image }),
    });
    return result.text;
  }

  async processReceiptFromBase64(ocrText: string, base64Image: string) {
    return this.request('/receipts/process', {
      method: 'POST',
      body: JSON.stringify({ ocrText, imageBase64: base64Image }),
    });
  }

  // Legacy methods (kept for backward compatibility)
  async uploadReceipt(imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const token = await this.getToken();
    const response = await fetch(`${API_BASE_URL}/receipts/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload receipt');
    }

    return response.json();
  }

  async extractReceiptText(imageUrl: string) {
    const result = await this.request<{ text: string }>('/receipts/extract-text', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
    return result.text;
  }

  async processReceipt(ocrText: string, imageUrl: string) {
    return this.request('/receipts/process', {
      method: 'POST',
      body: JSON.stringify({ ocrText, imageUrl }),
    });
  }

  /**
   * Combined method: Upload image, extract text, and process receipt in one request
   * This is faster than the separate upload -> extract -> process flow
   */
  async processReceiptImage(imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const token = await this.getToken();
    const response = await fetch(`${API_BASE_URL}/receipts/process-image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to process receipt image');
    }

    return response.json();
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  // Currency
  async convertCurrency(amount: number, from: string, to: string) {
    return this.request(`/currency/convert?amount=${amount}&from=${from}&to=${to}`);
  }

  // Chat/Assistant
  async askQuestion(question: string) {
    try {
      return await this.request<{ answer: string }>('/chat/ask', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
    } catch (error: any) {
      // Provide more helpful error message
      if (error.message?.includes('Cannot POST') || error.message?.includes('404')) {
        throw new Error('Chat endpoint not found. Please make sure the backend is running and restarted.');
      }
      throw error;
    }
  }

  // Budgets
  async getBudgets() {
    return this.request('/budgets');
  }

  async createBudget(budget: any) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  async getBudgetStatus(id: string) {
    return this.request(`/budgets/${id}/status`);
  }

  async checkBudgetAlerts() {
    return this.request('/budgets/alerts/check');
  }

  async updateBudget(id: string, budget: any) {
    return this.request(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(budget),
    });
  }

  async deleteBudget(id: string) {
    return this.request(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  // Bills
  async getBills() {
    return this.request('/bills');
  }

  async createBill(bill: any) {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify(bill),
    });
  }

  async getUpcomingBills(days: number = 7) {
    return this.request(`/bills/upcoming?days=${days}`);
  }

  async markBillAsPaid(id: string) {
    return this.request(`/bills/${id}/mark-paid`, {
      method: 'POST',
    });
  }

  async updateBill(id: string, bill: any) {
    return this.request(`/bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(bill),
    });
  }

  async deleteBill(id: string) {
    return this.request(`/bills/${id}`, {
      method: 'DELETE',
    });
  }

  // Templates
  async getTemplates() {
    return this.request('/templates');
  }

  async createTemplate(template: any) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async createExpenseFromTemplate(id: string, date?: string) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/templates/${id}/create-expense${query}`, {
      method: 'POST',
    });
  }

  async updateTemplate(id: string, template: any) {
    return this.request(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string) {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Wallets
  async getWallets() {
    return this.request('/wallets');
  }

  async createWallet(wallet: any) {
    return this.request('/wallets', {
      method: 'POST',
      body: JSON.stringify(wallet),
    });
  }

  async getTotalBalance(currency?: string) {
    const query = currency ? `?currency=${currency}` : '';
    return this.request(`/wallets/total${query}`);
  }

  async updateWallet(id: string, wallet: any) {
    return this.request(`/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(wallet),
    });
  }

  async deleteWallet(id: string) {
    return this.request(`/wallets/${id}`, {
      method: 'DELETE',
    });
  }

  async updateWalletBalance(id: string, amount: number) {
    return this.request(`/wallets/${id}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
  }

  // Challenges
  async getChallenges() {
    return this.request('/challenges');
  }

  async createChallenge(challenge: any) {
    return this.request('/challenges', {
      method: 'POST',
      body: JSON.stringify(challenge),
    });
  }

  async updateChallengeProgress(id: string) {
    return this.request(`/challenges/${id}/update-progress`, {
      method: 'POST',
    });
  }

  async updateChallenge(id: string, challenge: any) {
    return this.request(`/challenges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(challenge),
    });
  }

  async deleteChallenge(id: string) {
    return this.request(`/challenges/${id}`, {
      method: 'DELETE',
    });
  }

  // Export
  async exportExpensesCSV(startDate?: string, endDate?: string) {
    const queryString = new URLSearchParams(
      Object.entries({ startDate, endDate }).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
    ).toString();
    
    const token = await this.getToken();
    const response = await fetch(`${API_BASE_URL}/expenses/export/csv?${queryString}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    return response.text();
  }

  async exportExpensesJSON(startDate?: string, endDate?: string) {
    const queryString = new URLSearchParams(
      Object.entries({ startDate, endDate }).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
    ).toString();
    
    return this.request(`/expenses/export/json?${queryString}`);
  }

  // Geolocation
  async trackLocationEntry(location: { latitude: number; longitude: number; address?: string }) {
    return this.request('/geolocation/track-entry', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  async trackLocationExit(location: { latitude: number; longitude: number; entryTime: string | Date; address?: string }) {
    return this.request('/geolocation/track-exit', {
      method: 'POST',
      body: JSON.stringify({
        ...location,
        entryTime: location.entryTime instanceof Date ? location.entryTime.toISOString() : location.entryTime,
      }),
    });
  }

  async createLocationRule(rule: {
    locationType: string;
    latitude: number;
    longitude: number;
    radius: number;
    minTimeSpent: number;
    enabled: boolean;
  }) {
    return this.request('/geolocation/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async getLocationRules() {
    return this.request<LocationRule[]>('/geolocation/rules');
  }

  // Groups
  async getGroups() {
    return this.request('/groups');
  }

  async createGroup(data: { name: string; description?: string; baseCurrency?: string; memberIds?: string[] }) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGroup(id: string) {
    return this.request(`/groups/${id}`);
  }

  async updateGroup(id: string, data: { name?: string; description?: string; baseCurrency?: string }) {
    return this.request(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string) {
    return this.request(`/groups/${id}`, {
      method: 'DELETE',
    });
  }

  // Group Members
  async getGroupMembers(groupId: string) {
    return this.request(`/groups/${groupId}/members`);
  }

  async addGroupMembers(groupId: string, memberIds: string[]) {
    return this.request(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  }

  async removeGroupMember(groupId: string, userId: string) {
    return this.request(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Group Expenses
  async getGroupExpenses(groupId: string) {
    return this.request(`/groups/${groupId}/expenses`);
  }

  async createGroupExpense(groupId: string, data: {
    amount: number;
    currency: string;
    description: string;
    date: string;
    splitType: string;
    paidBy?: string;
    splitBetween: string[];
    splits?: Array<{ userId: string; amount: number }>;
  }) {
    return this.request(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteGroupExpense(groupId: string, expenseId: string) {
    return this.request(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  // Group Balances
  async getGroupBalances(groupId: string) {
    return this.request(`/groups/${groupId}/balances`);
  }

  // Group Settlements
  async createSettlement(groupId: string, data: {
    toUserId: string;
    amount: number;
    currency: string;
    note?: string;
  }) {
    return this.request(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSettlements(groupId: string) {
    return this.request(`/groups/${groupId}/settlements`);
  }

  // Group Invites & Join
  async joinGroupByCode(inviteCode: string) {
    return this.request('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async createGroupInvite(groupId: string, email: string) {
    return this.request(`/groups/${groupId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async acceptGroupInvite(token: string) {
    return this.request(`/groups/accept-invite/${token}`, {
      method: 'POST',
    });
  }

  // User Search
  async searchUsers(query: string) {
    return this.request(`/groups/search-users?q=${encodeURIComponent(query)}`);
  }

  // Subscriptions
  async getSubscriptionStatus() {
    return this.request<{ hasActiveSubscription: boolean; tier: string; expiresAt: string | null }>('/subscriptions/status');
  }

  async cancelSubscription() {
    return this.request('/subscriptions/cancel', {
      method: 'POST',
    });
  }

  async reactivateSubscription() {
    return this.request('/subscriptions/reactivate', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();

