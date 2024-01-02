
// SCHEMA FOR DATA:

// keys are stored in the 'keys' index.
// group information is stored in the following format:
type Group = {
    key: string,
    name: string,
    color: chrome.tabGroups.ColorEnum,
    tabs: GroupTab[]
}

type GroupTab = {
    name?: string,
    url?: string,
    favIconUrl?: string,
}

