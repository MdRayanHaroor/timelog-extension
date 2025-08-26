// graph-storage.js - Microsoft Graph API storage operations

/* global chrome */

// Handle module imports for Chrome extension context
let CONFIG, graphAuth

// Try to load from global scope if modules aren't available
if (typeof window !== "undefined") {
  CONFIG = window.CONFIG || {
    GRAPH_API_BASE: "https://graph.microsoft.com/v1.0",
    EXCEL_FILE_PATH: "/ChromeExt - DB/DB.xlsx",
    TABLE_NAME: "LogTable",
  }
  graphAuth = window.graphAuth
} else {
  const graphAuth = require("./graphAuth") // Assuming graphAuth is a module
  const CONFIG = require("./config") // Assuming CONFIG is a module
}

class GraphStorage {
  constructor() {
    this.auth = graphAuth
  }

  async fetchAllRecords() {
    try {
      const token = await this.auth.getValidToken()
      const url = `${CONFIG.GRAPH_API_BASE}/me/drive/root:${CONFIG.EXCEL_FILE_PATH}:/workbook/tables/${CONFIG.TABLE_NAME}/rows`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseRecordsFromGraph(data.value)
    } catch (error) {
      console.error("Error fetching records from Graph API:", error)
      throw error
    }
  }

  async insertRecord(logData) {
    try {
      const token = await this.auth.getValidToken()
      const url = `${CONFIG.GRAPH_API_BASE}/me/drive/root:${CONFIG.EXCEL_FILE_PATH}:/workbook/tables/${CONFIG.TABLE_NAME}/rows/add`

      const values = [
        [
          logData.logId || Date.now(), // Log_Id
          logData.projectName || "", // ProjectName
          logData.workItemId || "", // WorkItem
          logData.workItemType || "", // WorkItemType
          logData.date, // Date
          logData.developerName || "Unknown", // DeveloperName
          logData.hoursSpent, // HoursSpent
          logData.minutesSpent, // MinutesSpent
          logData.workItemURL || "", // WorkItemURL
          logData.description || "", // Description
        ],
      ]

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      })

      if (!response.ok) {
        throw new Error(`Failed to insert record: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error("Error inserting record to Graph API:", error)
      throw error
    }
  }

  parseRecordsFromGraph(graphRows) {
    return graphRows.map((row) => {
      const values = row.values[0] // Excel returns nested array
      return {
        logId: values[0],
        task: values[1], // ProjectName as task
        workItem: {
          id: values[2],
          type: values[3],
          organization: "", // Will be populated from other sources
          project: values[1],
          projectId: "",
          title: values[1],
        },
        description: values[9],
        hours: Number.parseInt(values[6]) || 0,
        minutes: Number.parseInt(values[7]) || 0,
        timestamp: values[4], // Use date as timestamp
        date: values[4].split("T")[0], // Extract date part
      }
    })
  }

  groupRecordsByDate(records) {
    const grouped = {}
    records.forEach((record) => {
      const date = record.date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(record)
    })
    return grouped
  }
}

// Create singleton instance and make it globally available
const graphStorage = new GraphStorage()
if (typeof window !== "undefined") {
  window.graphStorage = graphStorage
}
