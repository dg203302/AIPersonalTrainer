// Injects a shared back-to-top button and behavior
(function(){
    const createButton = () => {
        if (document.getElementById('back-to-top')) return document.getElementById('back-to-top');
        const btn = document.createElement('button');
        btn.id = 'back-to-top';
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label','Volver arriba');
        btn.title = 'Volver arriba';
        btn.innerText = '↑';
        document.body.appendChild(btn);
        return btn;
    };

    const init = () => {
        const btn = createButton();
        if(!btn) return;
        btn.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
        const onScroll = () => {
            btn.style.opacity = window.scrollY > 100 ? '1' : '0';
        };
        window.addEventListener('scroll', onScroll, {passive:true});
        onScroll();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {once:true});
    } else {
        init();
    }
})();
