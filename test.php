Menu="OtherSettings"
Title="VM Manager"
Icon="icon-virtualization"
Tag="columns"
---
<?
require_once "$docroot/plugins/dynamix.vm.manager/include/libvirt_helpers.php";

?>
<link type="text/css" rel="stylesheet" href="<?autov('/webGui/styles/jquery.filetree.css')?>">
<link type="text/css" rel="stylesheet" href="<?autov('/webGui/styles/jquery.switchbutton.css')?>">


<form markdown="1" id="settingsForm" method="POST" action="/update.php" target="progressFrame">
    <input type="hidden" name="#file" value="<?=htmlspecialchars($domain_cfgfile)?>">
    <input type="hidden" name="#arg[1]" value="cmdStatus=Apply">


    _(Default ISO storage path)_:
    : <input type="text" id="mediadir" name="MEDIADIR" autocomplete="off" spellcheck="false" data-pickfolders="true" data-pickfilter="HIDE_FILES_FILTER" data-pickroot="<?=is_dir('/mnt/user')?'/mnt/user':'/mnt'?>" value="<?=htmlspecialchars($domain_cfg['MEDIADIR'])?>" placeholder="_(Click to Select)_" pattern="^[^\\]*/$">
	<?if (!is_dir($domain_cfg['MEDIADIR'])):?><span><i class="fa fa-warning icon warning"></i> _(Path does not exist)_</span><?endif;?>

    :vms_libvirt_iso_storage_help:

    : <input type="button" id="applyBtn" value="_(Apply)_" disabled><input type="button" value="_(Done)_" onclick="done()">
</form>

</div>

<script src="<?autov('/webGui/javascript/jquery.filetree.js')?>" charset="utf-8"></script>
<script src="<?autov('/webGui/javascript/jquery.switchbutton.js')?>"></script>
<script src="<?autov('/plugins/dynamix.vm.manager/javascript/dynamix.vm.manager.js')?>"></script>
<script>

    $(function(){
        $.post("/plugins/dynamix.vm.manager/include/Fedora-virtio-isos.php",{},function(isos) {
            $('#winvirtio_select').html(isos).prop('disabled',false).change().each(function(){$(this).on('change',function() {
                // attach button updates when select element changes
                var form = $(this).parentsUntil('form').parent();
                form.find('input[value="<?=_("Apply")?>"],input[value="Apply"],input[name="cmdEditShare"],input[name="cmdUserEdit"]').not('input.lock').prop('disabled',false);
                form.find('input[value="<?=_("Done")?>"],input[value="Done"]').not('input.lock').val("<?=_('Reset')?>").prop('onclick',null).off('click').click(function(){formHasUnsavedChanges=false;refresh(form.offset().top);});
            });});
        });
        $("#applyBtn").click(function(){
            if ($("#deleteCheckbox").length && $("#deleteCheckbox").is(":checked")) {
                $("#removeForm").submit();
                return;
            }
        });

        $("#mediadir").on("input change", function(){
            $("#winvirtio_select").change();
        });

        $('#mediadir').fileTreeAttach();

        $.post("/plugins/dynamix.vm.manager/include/VMajax.php", {action:'reboot'}, function(data){
            var rebootMessage = "_(VM Settings: A reboot is required to apply changes)_";
            if (data.modified) addRebootNotice(rebootMessage); else removeRebootNotice(rebootMessage);
        });
    });
</script>
