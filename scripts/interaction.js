if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", ()=>DoDomSetup());
} else {
    DoDomSetup();
}

function DoDomSetup() {
    const root = document.documentElement;
    const contentRect = document.getElementById("interactibleContent").getBoundingClientRect();
    const width = contentRect.width/2;
    //10 pixels are deducted for 4 borders(1px each) and the scrollbar(6px)
    root.style.setProperty('--splitter-pos', `${width-10}px`);

    const moveBar = document.getElementById("resizeHandle");
    moveBar.addEventListener("pointerdown", (e) => {
        moveBar.setPointerCapture(e.pointerId);

        //offsetting to be the correct click pos
        const rect = moveBar.getBoundingClientRect();
        let startX = e.clientX - rect.left;
        //console.log(startX);

        const startWidth = root.style.getPropertyValue("--splitter-pos");
        const startWidthNum = parseInt(startWidth.substring(0,startWidth.length-2));

        //const contentRect = document.getElementById("interactibleContent").getBoundingClientRect();


        const OnDrag = (moveEvent) => {
            //doing same offset maths in addition to the starting offset
            let x = startWidthNum+ moveEvent.clientX-rect.left-startX;
            x = Math.min((contentRect.width*3)/4,x);
            x = Math.max((contentRect.width)/4, x);
            root.style.setProperty('--splitter-pos', `${x}px`);
        };

        const OnPointerUp = (upEvent) => {
            moveBar.releasePointerCapture(upEvent.pointerId);
            moveBar.removeEventListener("pointermove", OnDrag);
            moveBar.removeEventListener("pointerup", OnPointerUp);
        }

        moveBar.addEventListener("pointermove", OnDrag);
        moveBar.addEventListener("pointerup", OnPointerUp);
    });

    const userTextArea = document.getElementById("userInput");
    userTextArea.addEventListener("input", () => {
        const style = window.getComputedStyle(userTextArea);
        userTextArea.style.height = 'auto';
        let lineHeight = 0;

        if (style.lineHeight === "normal") {
            lineHeight = 1.2;
        } else {
            lineHeight = parseFloat(style.lineHeight);
        }
        //console.log(lineHeight);

        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);

        const textHeight = userTextArea.scrollHeight-paddingTop-paddingBottom;

        //NBNBNB CHECK IF THIS CHANGES BASED ON FONT SIZE
        const totalLines = Math.round(textHeight/(lineHeight*13));
        //console.log(totalLines)
        userTextArea.style.height = `${totalLines}lh`;
    });
}