<?php
$output = [];
$return_var = 0;
exec('pgrep -f "node nodejs/dirt.js"', $output, $return_var);
echo "Full path pgrep: " . $return_var . " (output: " . implode(',', $output) . ")\n";

$output = [];
exec('pgrep -f "node dirt.js"', $output, $return_var);
echo "Short path pgrep: " . $return_var . " (output: " . implode(',', $output) . ")\n";
?>
