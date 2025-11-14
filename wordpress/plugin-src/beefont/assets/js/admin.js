
jQuery(function($){
  $('#bf-create').on('click', function(){
    const f = $('#bf-file')[0].files[0];
    if(!f){ alert('Select an image'); return; }
    const fd = new FormData();
    fd.append('action','beefont_create');
    fd.append('nonce', BEEFNT.nonce);
    fd.append('family',$('#bf-family').val() || 'BeeHand');
    fd.append('image', f);
    $.ajax({ url:BEEFNT.ajax, method:'POST', data:fd, processData:false, contentType:false })
      .done(res=>{
        if(!res.success){ alert(res.data); return; }
        const sid = res.data.sid; $('#bf-log').html('Processing…');
        const t = setInterval(()=>{
          $.post(BEEFNT.ajax, {action:'beefont_poll', nonce:BEEFNT.nonce, sid})
            .done(r=>{
              if(!r.success){ clearInterval(t); $('#bf-log').text(r.data); return; }
              const d = r.data;
              if(d.status==='done'){
                clearInterval(t);
                let html = 'Done. ';
                if(d.zip_path) html += `<a class="button button-primary" href="/media/${d.zip_path}">Download ZIP</a>`;
                if(d.ttf_path) html += ` <a class="button" href="/media/${d.ttf_path}">TTF</a>`;
                $('#bf-log').html(html);
              } else if (d.status==='failed'){
                clearInterval(t); $('#bf-log').text('Failed: '+(d.log||''));
              }
            });
        }, 1500);
      })
      .fail(()=>alert('Network error'));
  });
});
