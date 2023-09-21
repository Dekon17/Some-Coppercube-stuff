/*
<behavior jsname = "behavior_BSGAI1" description = "BSG - Enemy AI model 1">

<property name = "AnimNode" type = "scenenode"/>
<property name = "Target" type = "scenenode"/>
<property name = "Speed" type = "float"/>
<property name = "Health" type = "float"/>
<property name = "DoOnAttack" type = "action"/>
<property name = "DoOnDeath" type = "action"/>
<property name = "AttackRate" type = "int"/>

</behavior>
*/

behavior_BSGAI1 = function()
{
this.LastTime = null;
this.Path = [];
this.AttackStart = null;
this.Aimed = false;
this.AimStart = null;
this.ReactStart = null;
this.Reacted = true;
this.NotAlerted = true;
this.LastCall = 0;
this.Dead = false;
this.DeathStart = null;
}

behavior_BSGAI1.prototype.onAnimate = function(node, timeMs)
{
var Delta = timeMs - this.LastTime;
var Group = ccbGetCopperCubeVariable ("AI." + this.Name + ".Group");
var Pos = ccbGetSceneNodeProperty (node, "Position");
var Rot = ccbGetSceneNodeProperty (node, "Rotation");

if (this.LastTime == null)
	{
	ccbSetSceneNodeProperty (node, "Looping", true);
	ccbSetAnimationFromSceneNode (node, this.AnimNode, "Aim");
	this.Delay = Math.random() * 400;
	this.LastTime = timeMs;
	this.Name = ccbGetSceneNodeProperty (node, "Name");
	this.HPvar = "AI." + this.Name + ".health";
	ccbSetCopperCubeVariable (this.HPvar, this.Health);
	this.DeathAnim = Math.ceil (Math.random () * 3);

	var PathFolderName = ccbGetCopperCubeVariable ("AI." + this.Name + ".Path");
	this.PathFolder = ccbGetSceneNodeFromName (PathFolderName);
	}

var Alert = ccbGetCopperCubeVariable ("AI.Group_" + Group + ".alert");
var SoundHeard = ccbGetCopperCubeVariable ("AI." + this.Name + ".sound");
var Health = ccbGetCopperCubeVariable (this.HPvar);
var PosTarg = ccbGetSceneNodeProperty (this.Target, "Position");
var Col = ccbGetCollisionPointOfWorldWithLine (Pos.x, Pos.y + 17.75, Pos.z, PosTarg.x, PosTarg.y, PosTarg.z);
if (Col)
	var NoCol = false;
else
	var NoCol = true;
var HealthDif = Health / this.Health;
if (HealthDif < 0)
	HealthDif = 0;

var State = Math.ceil (HealthDif) * (1 + Alert * 2 + (SoundHeard - SoundHeard * Alert) + this.Aimed * NoCol + 2 * !NoCol * Alert);

switch (State)
	{
	case 0:
		if (this.DeathStart == null)
			{
			this.DeathAnim = Math.ceil (Math.random () * 3);
			ccbSetAnimationFromSceneNode (node, this.AnimNode, "Death" + this.DeathAnim);
			this.DeathStart = timeMs;
			}
		if (timeMs > this.DeathStart + 1200 && this.Dead == false)
			{
			ccbRemoveSceneNode (node);
			var corpse = ccbCloneSceneNode (ccbGetSceneNodeFromName (this.Name.split (".") [0] + ".corpse" + this.DeathAnim));
			ccbSetSceneNodeProperty (corpse, "Name", this.Name + ".corpse");
			ccbSetSceneNodeParent (corpse, ccbGetSceneNodeFromName ("Level" + ccbGetCopperCubeVariable ("Level")));
			ccbSetSceneNodeProperty (corpse, "Visible", true);
			ccbSetSceneNodeProperty (corpse, "Rotation", Rot.x, Rot.y - 90, Rot.z);
			ccbSetSceneNodeProperty (corpse, "Position", Pos);
			this.Dead = true;
			}
		break;
	case 1:
		Detection (Pos, PosTarg, Rot, Col, Group);
		break;
	case 2:
		var Source = new vector3d (ccbGetCopperCubeVariable ("AI." + this.Name + ".soundSourceX"), 0, ccbGetCopperCubeVariable ("AI." + this.Name + ".soundSourceZ"));
		ccbSetSceneNodeProperty (node, "Rotation", Rot.x, Rotation (Pos, Source, Rot, Delta), Rot.z);
		Detection (Pos, PosTarg, Rot, Col, Group);
		break;
	case 3:
		ccbSetSceneNodeProperty (node, "Looping", false);
		this.Path = [];
		this.ReactStart = null;
		this.Reacted = false;

		if (this.AimStart == null)
			{
			this.AimStart = timeMs;
			if (this.NotAlerted)
				ccbSetAnimationFromSceneNode (node, this.AnimNode, "Alert" + Math.ceil (Math.random() * 2));
			else
				ccbSetAnimationFromSceneNode (node, this.AnimNode, "Aim");
			}
		var NewRot = Rotation (Pos, PosTarg, Rot, Delta);
		ccbSetSceneNodeProperty (node, "Rotation", Rot.x, NewRot, Rot.z);

		if (timeMs > this.AimStart + 5000 + this.Delay)
			{
			this.NotAlerted = false;
			this.Aimed = true;
			this.AttackStart = timeMs;
			}
		break;
	case 4:
		ccbSetSceneNodeProperty (node, "Rotation", Rot.x, Rotation (Pos, PosTarg, Rot, Delta), Rot.z);
		if (timeMs > this.AttackStart + this.AttackRate)
			{
			ccbInvokeAction (this.DoOnAttack);
			ccbSetSceneNodeProperty (node, "Animation", "None");
			ccbSetAnimationFromSceneNode (node, this.AnimNode, "ShootPistol");
			this.AttackStart = timeMs;
			}
		break;
	case 5:
		this.Aimed = false;
		this.AimStart = timeMs;
		if (this.Path.length == 0 && timeMs > this.LastCall)
			{
			ccbSetSceneNodeProperty (node, "Looping", true);
			ccbSetAnimationFromSceneNode (node, this.AnimNode, "Run");
			this.Path = Pathfind (Pos, PosTarg, this.PathFolder);
			this.LastCall = timeMs;
			if (this.Path)
				{
				var scale = ccbGetSceneNodeProperty (ccbGetSceneNodeFromName (this.Path [0]), "Scale");
				this.Add = new vector3d ((Math.random() - 0.5) * scale.x, 0, (Math.random() - 0.5) * scale.z);
				}
			}
		if (this.Path != false)
			{
			var PathPos = ccbGetSceneNodeProperty (ccbGetSceneNodeFromName (this.Path [0]), "Position").add (this.Add);
			var Dir = PathPos.substract (Pos);
			var Length = Dir.getLength ();
			Dir.normalize ();
			ccbSetSceneNodeProperty (node, "Rotation", Rot.x, Rotation (Pos, PathPos, Rot, Delta), Rot.z);
			if (Delta > Length / this.Speed)
				{
				this.Path.shift ();
				Pos = PathPos;

				var scale = ccbGetSceneNodeProperty (ccbGetSceneNodeFromName (this.Path [0]), "Scale");
				this.Add = new vector3d ((Math.random() - 0.5) * scale.x, 0, (Math.random() - 0.5) * scale.z);
				}
			else
				{
				Pos.x += Dir.x * this.Speed * Delta;
				Pos.y += Dir.y * this.Speed * Delta;
				Pos.z += Dir.z * this.Speed * Delta;
				}
			var Fld = ccbGetSceneNodeFromName ("LevelEnemies"), Count = ccbGetSceneNodeChildCount (Fld);
			for (var G = 0; G < Count; G++)
				{
				var Obj = ccbGetChildSceneNode (Fld, G);
				if (ccbGetSceneNodeProperty (Obj, "Name") != this.Name)
					{
					var EnemPos = ccbGetSceneNodeProperty (Obj, "Position");
					var EnemPos1 = new vector3d (EnemPos.x, 0, EnemPos.y), Pos1 = new vector3d (Pos.x, 0, Pos.y), YDif = EnemPos.y - Pos.y;
					var EnemDir = Pos1.substract (EnemPos1);
					if (EnemDir.getLength() < 4 && YDif < 18 && YDif > -18)
						{
						EnemDir.normalize ()
						Pos.x -= EnemDir.x * 4
						Pos.z -= EnemDir.z * 4
						}
					}
				}
			if (ccbGetCollisionPointOfWorldWithLine (Pos.x, Pos.y + 17.75, Pos.z, PosTarg.x, PosTarg.y, PosTarg.z) == null)
				{
				if (this.ReactStart == null)
					this.ReactStart = timeMs;
				if (timeMs > this.ReactStart + 500)
					this.Reacted = true;
				}
			ccbSetSceneNodeProperty (node, "Position", Pos);
			}
		else
			this.LastCall = timeMs + 5000;
		break;
	}
this.LastTime = timeMs;
};

function Detection (Pos, PosTarg, Rot, Col, Group)
{
var RadH = Math.atan2 (PosTarg.x - Pos.x, PosTarg.z - Pos.z);
var DegH = RadH * 180 / Math.PI;
var RotDif = DegH - Rot.y;

if (RotDif > 180)
	RotDif -= 360;
if (RotDif < -180)
	RotDif += 360;

if (RotDif >= -80 && RotDif <= 80 && Col == null)
	ccbSetCopperCubeVariable ("AI.Group_" + Group + ".alert", 1);
}

function Pathfind (Pos, PlrPos, Folder)
{
var Available = [];
var WasIn = [];
var Dists = [];
var Ignore = [];
var Nodes = ccbGetSceneNodeChildCount (Folder);
var LastPos = Pos;

Available = GetAvailable (Available, LastPos, Folder, Nodes, WasIn);

while (Available.length > 0)
	{
	var MinDist = Infinity;
	var ChosenNode = null;
	while (ChosenNode == null)
		{
		for (var n = 0; n < Available.length; n++)
			{
			var Node = ccbGetSceneNodeFromName (Available [n]);
			var TempNPos = ccbGetSceneNodeProperty (Node, "Position");

			var Dist = TempNPos.substract (LastPos).getLength() + TempNPos.substract (PlrPos).getLength();
			var Col1 = ccbGetCollisionPointOfWorldWithLine (LastPos.x, LastPos.y + 17.75, LastPos.z, TempNPos.x, TempNPos.y + 17.75, TempNPos.z);
			var Col2 = ccbGetCollisionPointOfWorldWithLine (LastPos.x, LastPos.y + 2, LastPos.z, TempNPos.x, TempNPos.y + 2, TempNPos.z);

			if (Dist < MinDist && WasIn.indexOf (ccbGetSceneNodeProperty (Node, "Name")) == -1 && Col1 == null && Col2 == null && Ignore.indexOf (ccbGetSceneNodeProperty (Node, "Name")) == -1)
				{
				MinDist = Dist;
				ChosenNode = Node;
				}
			}
		if (ChosenNode)
			break;
		else
			{
			if (WasIn.length > 0)
				{
				Ignore.push (WasIn [WasIn.length - 1]);
				WasIn.pop ();
				LastPos = ccbGetSceneNodeProperty (ccbGetSceneNodeFromName (WasIn [WasIn.length - 1]), "Position");
				}
			else
				break;
			}
		}

	if (ChosenNode)
		{
		var NPos = ccbGetSceneNodeProperty (ChosenNode, "Position");
		LastPos = NPos;
		var Name = ccbGetSceneNodeProperty (ChosenNode, "Name");
		WasIn.push (Name);
		Dists.push (MinDist);

		if (ccbGetCollisionPointOfWorldWithLine (NPos.x, NPos.y + 17.75, NPos.z, PlrPos.x, PlrPos.y, PlrPos.z) == null)
			{
			for (var g = 0; g < WasIn.length - 3; g++)
				{
				var p1 = ccbGetSceneNodeProperty (ccbGetSceneNodeFromName (WasIn [g]), "Position");
				var p2 = ccbGetSceneNodeProperty (ccbGetSceneNodeFromName (WasIn [g + 2]), "Position");
				if (ccbGetCollisionPointOfWorldWithLine (p1.x, p1.y, p1.z, p2.x, p2.y, p2.z) == null)
					{
					WasIn.splice (g+1, 1);
					g = 0;
					}
				}
			return WasIn;
			}

		var Index = Available.indexOf (Name);
		if (Index > -1)
			Available.splice (Index, Index);

		Available = GetAvailable (Available, LastPos, Folder, Nodes, WasIn);
		}
	else
		{
		return false;
		}
	}
}

function GetAvailable (Array, NPos, Folder, Nodes, WasIn)
{
for (var i = 0; i < Nodes; i++)
	{
	var NextNode = ccbGetChildSceneNode (Folder, i);
	var NextPos = ccbGetSceneNodeProperty (NextNode, "Position");
	var NextName = ccbGetSceneNodeProperty (NextNode, "Name");
	if (ccbGetCollisionPointOfWorldWithLine (NPos.x, NPos.y + 2, NPos.z, NextPos.x, NextPos.y + 2, NextPos.z) == null && WasIn.indexOf (NextName) == -1)
		{
		Array.push (NextName);
		}
	}
return Array;
}

function Rotation (Pos, PosTarg, Rot, Delta)
{
var DegH = Math.atan2 (PosTarg.x - Pos.x, PosTarg.z - Pos.z) * 180 / Math.PI;
var RotDif = DegH - Rot.y;
if (RotDif > 180)
	RotDif -= 360;
if (RotDif < -180)
	RotDif += 360;

var Dir = RotDif / Math.abs (RotDif);
var Next = 0.75 * Dir * Delta;

if (Math.abs (RotDif - Next) > Delta)
	var NextRot = Rot.y + Next;
else
	var NextRot = DegH;

return NextRot;
}