export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`)
  }
}

export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || ""
    this.headers = {
      "Content-Type": "application/json",
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      credentials: "include", // Include cookies for better-auth
      headers: {
        ...this.headers,
        ...options.headers,
      },
    }

    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new ApiError(response.status, response.statusText, errorData)
      }

      // Check if response has content
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return response.json()
      }

      return {} as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new Error(`Network error: ${error}`)
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : ""

    return this.request<T>(`${endpoint}${queryString}`, {
      method: "GET",
    })
  }

  // POST request
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  // PUT request
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    })
  }

  // Set custom headers
  setHeader(key: string, value: string): void {
    this.headers[key] = value
  }

  // Remove header
  removeHeader(key: string): void {
    delete this.headers[key]
  }
}

// Create a singleton instance
export const apiClient = new ApiClient()