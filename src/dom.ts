export function show(id: string): void {
    const obj = window.document.getElementById(id);
    if (obj === null) return;
    
    if (obj.hasAttribute('mar-display')) {
        if (obj.getAttribute('mar-display') == "") {
            obj.style.removeProperty('display');
        } else {
            obj.style.display = obj.getAttribute('mar-display')!;
        }
        
        obj.removeAttribute('mar-display');
    } else {
        obj.style.removeProperty('display');
    }
}

export function hide(id: string): void {
    const obj = window.document.getElementById(id);
    if (obj === null) return;

    obj.setAttribute('mar-display', obj.style.display);
    obj.style.display = 'none';
}

export function replaceContent(id: string, content: string): void {
    const obj = window.document.getElementById(id);
    if (obj === null) return;

    obj.innerHTML = content;
}