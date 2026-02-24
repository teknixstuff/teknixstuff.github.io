<?php
$file = '/var/www/counts/' . preg_replace('/[^a-zA-Z0-9_-]/s', '_', $_GET["id"]) . '.txt';
file_put_contents($file, file_get_contents($file) + 1);
header('Location: '.$_GET["target"]);