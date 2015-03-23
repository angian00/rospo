$(document).ready(function() {
	//mark correct menu item as active
    $("nav li a").each(function(index) {
    	var origPathname = window.location.pathname;
    	if (origPathname == "/")
    		origPathname = "/index.shtml";

    	if (this.pathname == origPathname)
    		$(this).parent().addClass("active");
    	else
    		$(this).parent().removeClass("active");
    });
});

