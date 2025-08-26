import CONFIG from "./config.js"
import chrome from "chrome"

class GraphAPIClient {
  constructor() {
    this.accessToken = null
    this.tokenExpiry = null
  }

  async authenticate() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken
      }

      // Get new token using Chrome Identity API
      const authUrl = `${CONFIG.MICROSOFT_GRAPH.AUTH_URL}?client_id=${CONFIG.MICROSOFT_GRAPH.CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(CONFIG.MICROSOFT_GRAPH.REDIRECT_URI)}&scope=${encodeURIComponent(CONFIG.MICROSOFT_GRAPH.SCOPE)}&response_mode=query`

      const redirectUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      })

      const urlParams = new URLSearchParams(new URL(redirectUrl).search)
      const authCode = urlParams.get("code")

      if (!authCode) {
        throw new Error("Authorization code not received")
      }

      const { adoSettings } = await chrome.storage.local.get(["adoSettings"])
      if (!adoSettings?.clientSecret) {
        throw new Error("Client secret not configured in settings")
      }

      // Exchange code for access token
      const tokenResponse = await fetch(CONFIG.MICROSOFT_GRAPH.ACCESS_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: CONFIG.MICROSOFT_GRAPH.CLIENT_ID,
          client_secret: adoSettings.clientSecret,
          code: authCode,
          grant_type: "authorization_code",
          redirect_uri: CONFIG.MICROSOFT_GRAPH.REDIRECT_URI,
          scope: CONFIG.MICROSOFT_GRAPH.SCOPE,
        }),
      })

      const tokenData = await tokenResponse.json()

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`)
      }

      this.accessToken = tokenData.access_token
      this.tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000)

      return this.accessToken
    } catch (error) {
      console.error("Authentication failed:", error)
      throw error
    }
  }

  async makeGraphRequest(endpoint, method = "GET", body = null) {
    const token = await this.authenticate()

    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : null,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Graph API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || "Unknown error"}`,
      )
    }

    return response.json()
  }

  async fetchAllTimeLogs() {
    try {
      const endpoint = `/me/drive/root:${CONFIG.ONEDRIVE.FILE_PATH}:/workbook/tables/${CONFIG.ONEDRIVE.TABLE_NAME}/rows`
      const response = await this.makeGraphRequest(endpoint)

      // Convert Excel rows to our timelog format
      return response.value.map((row) => this.convertExcelRowToTimeLog(row.values[0]))
    } catch (error) {
      console.error("Error fetching time logs from Excel:", error)
      throw error
    }
  }

  async addTimeLog(timeLog) {
    try {
      const endpoint = `/me/drive/root:${CONFIG.ONEDRIVE.FILE_PATH}:/workbook/tables/${CONFIG.ONEDRIVE.TABLE_NAME}/rows/add`

      // Generate unique Log_Id
      const logId = Date.now()

      // Convert timelog to Excel row format
      const excelRow = this.convertTimeLogToExcelRow(timeLog, logId)

      const body = {
        values: [excelRow],
      }

      await this.makeGraphRequest(endpoint, "POST", body)
      return logId
    } catch (error) {
      console.error("Error adding time log to Excel:", error)
      throw error
    }
  }

  convertTimeLogToExcelRow(timeLog, logId) {
    // Table Columns: Log_Id | ProjectName | WorkItem | WorkItemType | Date | DeveloperName | HoursSpent | MinutesSpent | WorkItemURL | Description
    const workItemUrl = timeLog.workItem?.id
      ? `https://dev.azure.com/${timeLog.workItem.organization}/${timeLog.workItem.project}/_workitems/edit/${timeLog.workItem.id}`
      : ""

    return [
      logId,
      timeLog.workItem?.project || "",
      timeLog.workItem?.id || "",
      timeLog.workItem?.type || "",
      timeLog.timestamp || new Date().toISOString(),
      "Developer", // You might want to get actual user name
      timeLog.hours || 0,
      timeLog.minutes || 0,
      workItemUrl,
      timeLog.description || "",
    ]
  }

  convertExcelRowToTimeLog(excelRow) {
    // Convert Excel row back to our timelog format
    const [
      logId,
      projectName,
      workItem,
      workItemType,
      date,
      developerName,
      hoursSpent,
      minutesSpent,
      workItemURL,
      description,
    ] = excelRow

    // Extract organization and project from URL if available
    let organization = ""
    let projectId = ""
    if (workItemURL) {
      const urlMatch = workItemURL.match(/https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems\/edit\/(\d+)/)
      if (urlMatch) {
        organization = urlMatch[1]
        projectId = urlMatch[2]
      }
    }

    return {
      task: workItemType ? `Work Item ${workItem}` : "Manual Entry",
      description: description || "",
      workItem: workItem
        ? {
            id: workItem.toString(),
            title: `Work Item ${workItem}`,
            type: workItemType || "",
            organization: organization,
            project: projectName || "",
            projectId: projectId,
          }
        : null,
      hours: Number.parseInt(hoursSpent) || 0,
      minutes: Number.parseInt(minutesSpent) || 0,
      timestamp: date || new Date().toISOString(),
      logId: logId,
    }
  }
}

// Create singleton instance
const graphClient = new GraphAPIClient()
export default graphClient
