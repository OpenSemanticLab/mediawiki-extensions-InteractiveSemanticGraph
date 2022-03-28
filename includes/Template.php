<?php

class Template {

	public static function onBeforePageDisplay( $out ) {

		$out->addModules( 'ext.Template' );

		return true;

	}

}
