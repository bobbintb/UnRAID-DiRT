Menu="Share:1"
Title="Share Settings"
Tag="share-alt-square"
---


<div class="clone1">
    <span class="clone">_(Read settings from)_</span><i class="fa fa-arrow-left fa-fw"></i>
    <span class="wrap"><select name="readshare" class="clone" onchange="toggleButton('readshare',false)">
	<option disabled selected>_(select)_...</option>
	<?
    foreach ($shares as $list) if ($list['name']!=$name || !$name) echo mk_option("", $list['name'], compress($list['name']));
    ?>
	</select></span><input type="button" id="readshare" value="_(Read)_" class="clone" onclick="readShare()" disabled>
</div>

<form markdown="1" name="share_edit" method="POST" action="/update.htm" target="progressFrame" onsubmit="return prepareEdit()"<?=$name?:">"?>
<div markdown="1" class="shade-<?=$display['theme']?>">
    _(Included disk(s))_:
    : <select id="s1" name="shareInclude1" multiple>
        <?foreach ($shares as $list):?>
            <?=mk_option("", $list['name'], compress($list['name']))?>
        <?endforeach;?>
    </select>

    :share_edit_included_disks_help:

    _(Excluded disk(s))_:
    : <select id="s2" name="shareExclude1" multiple>
        <?foreach ($shares as $list):?>
            <?=mk_option("", $list['name'], compress($list['name']))?>
        <?endforeach;?>
    </select>

    :share_edit_excluded_disks_help:
</div>

&nbsp;
: <input type="button" value="_(Done)_" onclick="done()">
</form>

<script>


    let checkRequiredPrimary = false;

    function initializeDropdown(selector, emptyText, width, firstItemChecksAll = false) {
        try {
            $(selector).dropdownchecklist({
                emptyText: emptyText,
                width: width,
                explicitClose: "..._(close)_",
                firstItemChecksAll: firstItemChecksAll
            });
        } catch (e) {
            console.error(`Error initializing ${selector}: ` + e.message);
        }
    }

    function destroyDropdownIfExists(selector) {
        try {
            $(selector).dropdownchecklist('destroy');
        } catch (e) {
            if (e.message.includes('prior to initialization')) {
                console.log(`${selector} not initialized, skipping destroy.`);
            } else {
                console.error(`Error destroying ${selector}: ` + e.message);
            }
        }
    }

    function readShare() {
        /* Declare variables at the function scope */
        var name, data, disk, include, exclude, i, j;

        name = $('select[name="readshare"]').val();
        initDropdown(true);
    }

    /* Remove characters not allowed in share name. */
    function checkName(name) {
        /* Declare variables at the function scope */
        var isValidName;

        isValidName = /^[A-Za-z0-9-_.: ]*$/.test(name);

        if (isValidName) {
            $('#zfs-name').hide();
        } else {
            $('#zfs-name').show();
        }
    }

    $(function() {
        initializeDropdown('#s1', "_(Select shares to monitor...)_", <?=$width[1]?>);
        initializeDropdown('#s2', "_(None)_", <?=$width[1]?>);
        checkName($('#shareName').val());
    });
</script>
