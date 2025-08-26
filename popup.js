document.addEventListener("DOMContentLoaded", async () => {
  console.log("[v0] Popup DOM loaded, initializing...");

  // Set default dates to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("taskDate").value = today;
  document.getElementById("filterDate").value = today;

  // Load tasks for today by default
  await loadTasksForDate(today);

  await initializeAzureDevOpsSettings();

  // Add task form submission
  document.getElementById("addTaskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addTask();
  });

  // Event listeners for filters
  document.getElementById("filterDate").addEventListener("change", (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      loadTasksForDate(selectedDate);
    }
  });
  document.getElementById("viewOrgSelector").addEventListener("change", (e) => {
    const org = e.target.value;
    showViewProjectSelector(!!org);
    if(org) loadProjectsForView(org);
    applyFilters();
  });
  document.getElementById("viewProjectSelector").addEventListener("change", (e) => {
    const projectId = e.target.value;
    const org = document.getElementById("viewOrgSelector").value;
    showViewWorkItemSelector(!!projectId && !!org);
    if (projectId && org) loadWorkItemsForView(org, projectId);
    applyFilters();
  });
  document.getElementById("viewWorkItemSelector").addEventListener("change", applyFilters);


  // Event listeners for add task dropdowns
    document.getElementById("organizationInput").addEventListener("input", (e) => {
        const org = e.target.value.trim();
        showProjectSelector(!!org);
        if(org) loadProjectsForAddTask(org);
    });

    document.getElementById("projectSelector").addEventListener("change", (e) => {
        const projectId = e.target.value;
        const org = document.getElementById("organizationInput").value.trim();
        showWorkItemSelector(!!projectId && !!org);
        if(projectId && org) loadWorkItemsForAddTask(org, projectId);
    });

  // Retry button to manually fetch current page details
  document.getElementById("retryButton").addEventListener("click", async () => {
    console.log("[v0] Retry button clicked - manually detecting work item");

    try {
      const retryBtn = document.getElementById("retryButton");
      retryBtn.innerHTML = "⏳";
      retryBtn.disabled = true;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url) {
        showMessage("Could not access current tab", "error");
        return;
      }

      const workItemMatch = tab.url.match(/https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems\/edit\/(\d+)/);

      if (!workItemMatch) {
        showMessage("Not on an Azure DevOps work item page", "error");
        return;
      }

      const [, organization, project, workItemId] = workItemMatch;
      const workItemData = {
        organization: decodeURIComponent(organization),
        project: decodeURIComponent(project),
        id: Number.parseInt(workItemId),
      };

      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "WORK_ITEM_DETECTED",
            workItem: workItemData,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      showMessage("Work item detected! Attempting to pre-select...", "success");
      await checkAndPreSelectWorkItem();
    } catch (error) {
      console.error("[v0] Error in retry button:", error);
      showMessage("Error detecting work item: " + error.message, "error");
    } finally {
      const retryBtn = document.getElementById("retryButton");
      retryBtn.innerHTML = "🔄";
      retryBtn.disabled = false;
    }
  });

  await checkAndPreSelectWorkItem();
});

async function addTask() {
  const date = document.getElementById("taskDate").value;
  const orgInput = document.getElementById("organizationInput");
  const projectSelector = document.getElementById("projectSelector");
  const workItemSelector = document.getElementById("workItemSelector");
  const selectedOrg = orgInput.value.trim();
  const selectedProject = projectSelector.value;
  const selectedWorkItem = workItemSelector.value;
  const selectedWorkItemText = workItemSelector.options[workItemSelector.selectedIndex].text;
  const hours = Number.parseInt(document.getElementById("hours").value) || 0;
  const minutes = Number.parseInt(document.getElementById("minutes").value) || 0;

  if (!date || !selectedOrg || !selectedProject || !selectedWorkItem || (hours === 0 && minutes === 0)) {
    showMessage("Please fill in all required fields and enter a time.", "error");
    return;
  }

  let workItemInfo = {};
  if (selectedWorkItem.startsWith("wi:") || selectedWorkItem.startsWith("backlog:")) {
    const workItemId = selectedWorkItem.split(":")[1];
    const [title, type] = selectedWorkItemText.split(" - ");
    workItemInfo = {
      id: workItemId,
      title: title,
      type: type,
      organization: selectedOrg,
      project: projectSelector.options[projectSelector.selectedIndex].text,
      projectId: selectedProject,
    };
  }

  try {
    const existingTasks = await getTasksForDate(date);
    const newTask = {
      task: workItemInfo.title || selectedWorkItemText,
      workItem: workItemInfo,
      hours: hours,
      minutes: minutes,
      timestamp: new Date().toISOString(),
    };
    existingTasks.push(newTask);
    await saveTasksForDate(date, existingTasks);

    document.getElementById("hours").value = "0";
    document.getElementById("minutes").value = "0";
    document.getElementById("workItemSelector").value = "";

    showMessage("Time log added successfully!", "success");

    if (document.getElementById("filterDate").value === date) {
      loadTasksForDate(date);
    }
  } catch (error) {
    console.error("Error saving task:", error);
    showMessage("Error saving task. Please try again.", "error");
  }
}

async function loadTasksForDate(date) {
  try {
    const tasks = await getTasksForDate(date);
    applyFiltersToTasks(tasks);
  } catch (error) {
    console.error("Error loading tasks:", error);
    showMessage("Error loading tasks.", "error");
  }
}

async function applyFilters() {
    const filterDate = document.getElementById("filterDate").value;
    if (filterDate) {
        const tasks = await getTasksForDate(filterDate);
        applyFiltersToTasks(tasks);
    }
}


function applyFiltersToTasks(tasks) {
  const selectedOrg = document.getElementById("viewOrgSelector").value;
  const selectedProject = document.getElementById("viewProjectSelector").value;
  const selectedWorkItem = document.getElementById("viewWorkItemSelector").value;

  let filteredTasks = tasks;

  if (selectedOrg) {
    filteredTasks = filteredTasks.filter((task) => task.workItem?.organization === selectedOrg);
  }

  if (selectedProject) {
    filteredTasks = filteredTasks.filter((task) => task.workItem?.projectId === selectedProject);
  }

  if (selectedWorkItem) {
    const workItemId = parseInt(selectedWorkItem.split(":")[1], 10);
    filteredTasks = filteredTasks.filter((task) => task.workItem?.id == workItemId);
  }

  displayTasks(filteredTasks);
  displayDailyTotal(filteredTasks);
}

// Settings functions
async function initializeAzureDevOpsSettings() {
  const settings = await getADOSettings();

  if (settings.pat && settings.expiresAt) {
    const expiryDate = new Date(settings.expiresAt);
    if (expiryDate > new Date()) {
      showPATStatus(true, expiryDate);
      updateSettingsSummary(expiryDate);
      disablePATInputs();
      document.getElementById("pat").value = settings.pat;
      loadOrganizations();
      await autoPopulateOrganization();
    } else {
      showPATStatus(false, expiryDate);
      updateSettingsSummary(expiryDate);
    }
    document.getElementById("expiryDate").value = expiryDate.toISOString().split("T")[0];
  }

  document.getElementById("togglePat").addEventListener("click", togglePATVisibility);
  document.getElementById("savePat").addEventListener("click", savePATSettings);
  document.getElementById("replacePat").addEventListener("click", enablePATInputs);
  document.getElementById("clearPat").addEventListener("click", clearPATSettings);
}

function showPATStatus(isValid, expiryDate) {
  const patStatus = document.getElementById("patStatus");
  patStatus.textContent = isValid ? "Valid" : "Expired";
  patStatus.style.color = isValid ? "green" : "red";
}

function updateSettingsSummary(expiryDate) {
  document.getElementById("settingsSummary").textContent = `Settings - PAT expires on ${expiryDate.toISOString().split("T")[0]}`;
}

async function autoPopulateOrganization() {
  const settings = await getADOSettings();
  if (settings.organization && settings.pat && new Date(settings.expiresAt) > new Date()) {
    const orgInput = document.getElementById("organizationInput");
    orgInput.value = settings.organization;
    orgInput.dispatchEvent(new Event("input"));
  }
}

async function loadOrganizations() {
  const settings = await getADOSettings();
  if (!settings.pat) return;

  showLoading("orgLoading", true);
  try {
    const data = await fetchOrganizations(settings.pat);
    populateOrganizationDropdowns(data.value);
  } catch (error) {
    console.error("Error loading organizations:", error);
    showMessage("Failed to load organizations. Check your PAT.", "error");
  } finally {
    showLoading("orgLoading", false);
  }
}

function populateOrganizationDropdowns(organizations) {
  ["organizationSelector", "viewOrgSelector"].forEach((selectorId) => {
    const selector = document.getElementById(selectorId);
    selector.innerHTML = selectorId === "viewOrgSelector"
      ? '<option value="">All organizations</option>'
      : '<option value="">Select organization...</option>';
    organizations.forEach((org) => {
      const option = document.createElement("option");
      option.value = org.accountName;
      option.textContent = org.accountName;
      selector.appendChild(option);
    });
  });
}

async function savePATSettings() {
  const pat = document.getElementById("pat").value.trim();
  const expiryDate = document.getElementById("expiryDate").value;
  const organization = document.getElementById("organization").value.trim();

  if (!pat || !expiryDate) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  const settings = { pat, expiresAt: new Date(expiryDate).toISOString(), organization };

  try {
    await saveADOSettings(settings);
    showPATStatus(true, new Date(expiryDate));
    updateSettingsSummary(new Date(expiryDate));
    disablePATInputs();
    document.getElementById("pat").value = pat;
    await loadOrganizations();
    await autoPopulateOrganization();
    showMessage("Settings saved successfully!", "success");
  } catch (error) {
    console.error("Error saving settings:", error);
    showMessage("Error saving settings", "error");
  }
}

function enablePATInputs() {
  document.getElementById("pat").disabled = false;
  document.getElementById("expiryDate").disabled = false;
  document.getElementById("savePat").style.display = "inline-block";
  document.getElementById("replacePat").style.display = "none";
  document.getElementById("patStatus").style.display = "none";
}

function disablePATInputs() {
  document.getElementById("pat").disabled = true;
  document.getElementById("expiryDate").disabled = true;
  document.getElementById("savePat").style.display = "none";
  document.getElementById("replacePat").style.display = "inline-block";
  document.getElementById("patStatus").style.display = "inline-block";
}

async function clearPATSettings() {
  await clearADOSettings();
  document.getElementById("pat").value = "";
  document.getElementById("expiryDate").value = "";
  document.getElementById("organization").value = "";
  document.getElementById("organizationInput").value = "";
  document.getElementById("patStatus").style.display = "none";
  document.getElementById("settingsSummary").textContent = "Settings";
  enablePATInputs();
  document.getElementById("viewOrgSelector").innerHTML = '<option value="">All organizations</option>';
  document.getElementById("projectSelector").innerHTML = '<option value="">Select project...</option>';
  document.getElementById("workItemSelector").innerHTML = '<option value="">Select work item...</option><optgroup label="My Work Items" id="addTaskWorkItemsGroup"></optgroup><optgroup label="My Backlog" id="addTaskBacklogGroup"></optgroup>';
  showViewProjectSelector(false);
  showViewWorkItemSelector(false);
  showMessage("Settings cleared", "success");
}

async function loadProjectsForAddTask(org) {
    const settings = await getADOSettings();
    if (!settings.pat) return;

    showLoading("projectLoading", true);
    try {
        const data = await fetchProjects(settings.pat, org);
        populateProjectsForAddTask(data.value);
    } catch (error) {
        console.error("Error loading projects for add task:", error);
        showMessage("Failed to load projects. Check your settings.", "error");
    } finally {
        showLoading("projectLoading", false);
    }
}

async function loadWorkItemsForAddTask(org, projectId) {
  const settings = await getADOSettings();
  if (!settings.pat) return;

  showLoading("workItemLoading", true);
  try {
    const workItemsQuery = "SELECT [System.Id], [System.WorkItemType] FROM WorkItems WHERE [System.AssignedTo] = @Me ORDER BY [System.ChangedDate] DESC";
    const backlogQuery = `SELECT [System.Id], [System.WorkItemType] FROM WorkItems WHERE [System.WorkItemType] IN ('Product Backlog Item','User Story','Feature') AND [System.State] <> 'Done' AND [System.AssignedTo] = @Me ORDER BY [System.ChangedDate] DESC`;

    const [workItemsData, backlogData] = await Promise.all([
      fetchWorkItems(settings.pat, org, projectId, workItemsQuery),
      fetchWorkItems(settings.pat, org, projectId, backlogQuery),
    ]);

    populateWorkItemsForAddTask(workItemsData.value);
    populateBacklogItemsForAddTask(backlogData.value);
  } catch (error) {
    console.error("Error loading work items for add task:", error);
    showMessage("Failed to load work items", "error");
  } finally {
    showLoading("workItemLoading", false);
  }
}

async function loadProjectsForView(org) {
  const settings = await getADOSettings();
  if (!settings.pat) return;

  showLoading("viewProjectLoading", true);
  try {
    const data = await fetchProjects(settings.pat, org);
    populateProjectsForView(data.value);
  } catch (error) {
    console.error("Error loading projects for view:", error);
    showMessage("Failed to load projects. Check your settings.", "error");
  } finally {
    showLoading("viewProjectLoading", false);
  }
}

async function loadWorkItemsForView(org, projectId) {
  const settings = await getADOSettings();
  if (!settings.pat) return;

  showLoading("viewWorkItemLoading", true);
  try {
    const workItemsQuery = "SELECT [System.Id], [System.WorkItemType] FROM WorkItems WHERE [System.AssignedTo] = @Me ORDER BY [System.ChangedDate] DESC";
    const backlogQuery = `SELECT [System.Id], [System.WorkItemType] FROM WorkItems WHERE [System.WorkItemType] IN ('Product Backlog Item','User Story','Feature') AND [System.State] <> 'Done' AND [System.AssignedTo] = @Me ORDER BY [System.ChangedDate] DESC`;

    const [workItemsData, backlogData] = await Promise.all([
      fetchWorkItems(settings.pat, org, projectId, workItemsQuery),
      fetchWorkItems(settings.pat, org, projectId, backlogQuery),
    ]);

    populateWorkItemsForView(workItemsData.value);
    populateBacklogItemsForView(backlogData.value);
  } catch (error) {
    console.error("Error loading work items for view:", error);
    showMessage("Failed to load work items", "error");
  } finally {
    showLoading("viewWorkItemLoading", false);
  }
}

// UI Population functions
function populateProjectsForAddTask(projects) {
  const projectSelector = document.getElementById("projectSelector");
  projectSelector.innerHTML = '<option value="">Select project...</option>';
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    projectSelector.appendChild(option);
  });
}

function populateProjectsForView(projects) {
  const viewProjectSelector = document.getElementById("viewProjectSelector");
  viewProjectSelector.innerHTML = '<option value="">All projects</option>';
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    viewProjectSelector.appendChild(option);
  });
}

function populateWorkItemsForAddTask(workItems) {
  const workItemsGroup = document.getElementById("addTaskWorkItemsGroup");
  workItemsGroup.innerHTML = "";
  workItems.forEach((wi) => {
    const option = document.createElement("option");
    option.value = `wi:${wi.id}`;
    option.textContent = `${wi.fields["System.Title"]} - ${wi.fields["System.WorkItemType"]}`;
    workItemsGroup.appendChild(option);
  });
}

function populateBacklogItemsForAddTask(backlogItems) {
  const backlogGroup = document.getElementById("addTaskBacklogGroup");
  backlogGroup.innerHTML = "";
  backlogItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = `backlog:${item.id}`;
    option.textContent = `${item.fields["System.Title"]} - ${item.fields["System.WorkItemType"]}`;
    backlogGroup.appendChild(option);
  });
}

function populateWorkItemsForView(workItems) {
  const workItemsGroup = document.getElementById("viewWorkItemsGroup");
  workItemsGroup.innerHTML = "";
  workItems.forEach((wi) => {
    const option = document.createElement("option");
    option.value = `wi:${wi.id}`;
    option.textContent = `${wi.fields["System.Title"]} - ${wi.fields["System.WorkItemType"]}`;
    workItemsGroup.appendChild(option);
  });
}

function populateBacklogItemsForView(backlogItems) {
  const backlogGroup = document.getElementById("viewBacklogGroup");
  backlogGroup.innerHTML = "";
  backlogItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = `backlog:${item.id}`;
    option.textContent = `${item.fields["System.Title"]} - ${item.fields["System.WorkItemType"]}`;
    backlogGroup.appendChild(option);
  });
}

// Helper functions for showing/hiding selectors
function showProjectSelector(show) {
    document.getElementById("projectSelectorGroup").style.display = show ? "block" : "none";
}

function showWorkItemSelector(show) {
    document.getElementById("workItemSelectorGroup").style.display = show ? "block" : "none";
}

function showViewProjectSelector(show) {
    document.getElementById("viewProjectSelectorGroup").style.display = show ? "block" : "none";
}

function showViewWorkItemSelector(show) {
    document.getElementById("viewWorkItemSelectorGroup").style.display = show ? "block" : "none";
}


async function checkAndPreSelectWorkItem() {
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GET_CURRENT_WORK_ITEM" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.id) {
      await preSelectWorkItem(response);
    }
  } catch (error) {
    console.error("[v0] Error checking current work item:", error);
  }
}

async function preSelectWorkItem(workItem) {
  try {
    const settings = await getADOSettings();
    if (!settings.pat) {
      showMessage("PAT not configured - cannot auto-select work item", "error");
      return;
    }

    if (!workItem.organization || !workItem.project || !workItem.id) {
      showMessage("Incomplete work item data for auto-selection", "error");
      return;
    }

    const orgInput = document.getElementById("organizationInput");
    orgInput.value = workItem.organization;

    await loadProjectsForAddTask(workItem.organization);

    const projectSelector = document.getElementById("projectSelector");
    let projectId;
    for (const option of projectSelector.options) {
      if (option.textContent.toLowerCase() === workItem.project.toLowerCase()) {
        projectSelector.value = option.value;
        projectId = option.value;
        break;
      }
    }

    if (!projectId) {
      showMessage(`Project "${workItem.project}" not found or not accessible`, "error");
      return;
    }

    await loadWorkItemsForAddTask(workItem.organization, projectId);

    const workItemSelector = document.getElementById("workItemSelector");
    for (const option of workItemSelector.options) {
      if (option.value === `wi:${workItem.id}` || option.value === `backlog:${workItem.id}`) {
        workItemSelector.value = option.value;
        showMessage(`Auto-selected: Work Item ${workItem.id}`, "success");
        break;
      }
    }
  } catch (error) {
    console.error("[v0] Error pre-selecting work item:", error);
    showMessage("Error auto-selecting work item", "error");
  }
}