

$(function() {
    // Wire the tabbed lower panel (Complementary Policies / Emissions Cap /
    // Emissions History). The upper "updates" panel that used the same
    // .tabs class was removed, so we no longer init slideshow tabs for it
    // — and crucially, we no longer call $("table.tabs").tabs(...) twice,
    // which would overwrite the first binding with a now-nonexistent target.
    $("table.tabs").tabs("div.panes > div");
});

$(function(){
  $("#accordion").accordion({
                            header: "h2",
                            collapsible:true,
                            heightStyle: "content",
                            active:false
  });
   $("#accordion").accordion("option", "icons", 
        { 'header': 'ui-icon-carat-1-e', 'activeHeader': 'ui-icon-carat-1-s' });
  });
  
