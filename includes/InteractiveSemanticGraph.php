<?php

class InteractiveSemanticGraph {

	public static function onBeforePageDisplay( $out ) {

		$out->addModules( 'ext.InteractiveSemanticGraph' );

		return true;

	}

}
