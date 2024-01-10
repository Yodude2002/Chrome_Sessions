import Tab = chrome.tabs.Tab;

function createDiv(cl: string[], f: (d: HTMLDivElement) => void = (_e)=>{}): HTMLDivElement {
    let d = document.createElement("div");
    d.classList.add(...cl);
    f(d);
    return d;
}

function apply<T>(t: T, f: (t: T) => void ): T {
    f(t);
    return t;
}

function onSaveGroup() {
    //chrome.runtime.sendMessage({
    //    "message": 'save'
    //} satisfies PopupMessage)
    //    .then((_v) => {})
    saveGroup().catch(console.error);
}

window.addEventListener('load', () => {
    document.getElementById("button_save_session")!.onclick = onSaveGroup;

    let container = document.querySelector("div.list_container.expanded")! as HTMLDivElement
    let fc = container.firstElementChild! as HTMLDivElement;
    fc.onclick = () => openDrawer(fc);

    chrome.storage.local.onChanged.addListener(_ch => {
        chrome.storage.local.get().then((o) => {
            updateUiList(o);
        }).catch(console.error)
    })

    chrome.storage.local.get().then((o) => {
        updateUiList(o);
    }).catch(console.error)
})

async function saveGroup() {
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });
    if (!tab) {
        console.warn("no current tab found");
        return;
    }
    if (tab.groupId == -1) {
        console.log("tab has no group");
        return;
    }
    const group = await chrome.tabGroups.get(tab.groupId);
    let tabs = await chrome.tabs.query({
        windowId: tab.windowId,
        groupId: tab.groupId
    });

    let group_name = (group.title && group.title != "")
        ? group.title
        : `Group ${tab.groupId}`;

    console.log(tabs)
    const session: Group = {
        name: group_name,
        key: crypto.randomUUID(),
        color: group.color,
        tabs: tabs.map((t) => {
            let gt: GroupTab = {
                favIconUrl: t.favIconUrl,
                name: t.title,
                url: t.url
            }
            return gt;
        })
    };
    await chrome.storage.local.set({
        [session.key]: session
    })
}

function updateUiList(data: {[key: string]: Group}) {
    const list = document.getElementById("element_container") as HTMLDivElement;
    list.replaceChildren();
    for (const k in data) {
        const group = data[k];
        list.appendChild(makeListItem(group));
    }
}

function makeListItem(group: Group): HTMLDivElement {
    return createDiv(["list_container"], (container) => {
        container.appendChild(createDiv(["list_item"], (item) => {

            item.appendChild(createDiv(["list_text"], (name) =>  {
                name.innerText = group.name;
            }))

            item.appendChild(createDiv(["list_open"], (img) => {
                img.appendChild(apply(document.createElement("button"), (btn) => {
                    btn.classList.add("icon", "list_open_in", "list_btn");
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        openTabGroup(group).catch(console.error)
                    };
                }))
            }))

            item.onclick = (e) => {
                e.stopPropagation();
                openDrawer(item);
            }
        }))

        container.appendChild(createDiv(["list_drawer"], (drawer) => {
            drawer.appendChild(createDiv(["list_item"], (toolbox) => {
                toolbox.style.width = "min-content";
                toolbox.style.margin = "0 auto";

                toolbox.appendChild(createDiv(["list_open"], (edit) => {
                    edit.appendChild(apply(document.createElement("button"), (b) => {
                        b.classList.add("icon", "list_edit_note", "list_btn");
                        b.onclick = (e) => {
                            e.stopPropagation();
                            renameGroup(group);
                        }
                    }))
                }))
                toolbox.appendChild(createDiv(["list_open"], (del) => {
                    del.style.backgroundColor = "var(--color-error)";
                    del.appendChild(apply(document.createElement("button"), (btn) => {
                        btn.classList.add("icon", "list_delete", "list_btn");
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            deleteGroup(group);
                        }
                    }))
                }))
            }))

            for (const tab of group.tabs) {
                drawer.appendChild(createDiv(["list_item"], (el) => {
                    el.appendChild(createDiv(["list_text", "favicon_container"], (text) => {
                        text.appendChild(apply(document.createElement("img"), (img) => {
                            img.classList.add("favicon");
                            if (tab.favIconUrl) {
                                img.src = tab.favIconUrl;
                            }
                            if (tab.name) {
                                img.alt = tab.name;
                            }
                        }))
                        text.appendChild(document.createTextNode(tab.name ?? "Tab"));
                    }))
                    el.appendChild(createDiv(["list_open", "btn_hover"], (del) => {
                        del.style.backgroundColor = "var(--color-error)";
                        del.appendChild(apply(document.createElement("button"), (btn) => {
                            btn.classList.add("icon", "list_delete", "list_btn");
                        }))
                    }))

                    el.onclick = (e) => {
                        e.stopPropagation();
                        if (tab.url) {
                            chrome.tabs.create({
                                url: tab.url
                            }).catch(console.error)
                        }
                    };
                }))
            }

        }))
    })
}

async function openTabGroup(group: Group) {
    let tabs: Tab[] = [];
    for (const tab of group.tabs) {
        tabs.push(await chrome.tabs.create({
            url: tab.url,
        }))
    }
    let gid = await chrome.tabs.group({
        tabIds: tabs.map((t) => t.id!)
    })
    await chrome.tabGroups.update(gid, {
        color: group.color,
        title: group.name
    })
}

// div is the top of the drawer (container is parent)
function openDrawer(div: HTMLDivElement) {
    const container = div.parentElement as HTMLDivElement | null;
    if (!container) {
        console.warn("yikes, container is null");
        return;
    }
    container.classList.toggle("expanded")
}

function renameGroup(_group: Group) {
    let group = { ..._group } as Group;
    let new_name = prompt("Enter a name for this Session", group.name);

    if (new_name) {
        group.name = new_name;
        chrome.storage.local.set({
            [group.key]: group
        }).catch(console.error)
    }
}

function deleteGroup(group: Group) {
    if (confirm(`Do you want to delete the group "${group.name}"?`)) {
        chrome.storage.local.remove(group.key).catch(console.error);
    }
}