from rest_framework import serializers
from .models import Field, Fruit, Row, Image, Estimation, Farm


# FARM
class FieldBasicSerializer(serializers.ModelSerializer):
    field_id = serializers.IntegerField(source='id', read_only=True)
    class Meta:
        model = Field
        fields = ['field_id', 'short_name', 'name', 'description']


class FarmWithFieldsSerializer(serializers.ModelSerializer):
    farm_id = serializers.IntegerField(source='id', read_only=True)
    fields = FieldBasicSerializer(many=True, read_only=True)
    class Meta:
        model = Farm
        fields = ['farm_id', 'name', 'fields']
        
# FRUIT
class FruitSerializer(serializers.ModelSerializer):
    fruit_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = Fruit
        fields = [
            'fruit_id', 'short_name', 'name', 'description',
            'yield_start_date', 'yield_end_date',
            'yield_avg_kg', 'fruit_avg_kg'
        ]


# RAW
class RowSerializer(serializers.ModelSerializer):
    row_id = serializers.IntegerField(source='id', read_only=True)
    fruit_id = serializers.IntegerField(source='fruit.id', read_only=True)
    fruit_type = serializers.CharField(source='fruit.name', read_only=True)

    class Meta:
        model = Row
        fields = ['row_id', 'short_name', 'name', 'nb_plant', 'fruit_id', 'fruit_type']



class FieldSerializer(serializers.ModelSerializer):
    field_id = serializers.IntegerField(source='id', read_only=True)
    svg_map_url = serializers.SerializerMethodField()
    background_image_url = serializers.SerializerMethodField()

    def get_svg_map_url(self, obj):
        if obj.svg_map:
            return obj.svg_map.url  # ✅ Always relative
        return None

    def get_background_image_url(self, obj):
        if hasattr(obj, 'background_image') and obj.background_image:
            return obj.background_image.url  # ✅ Always relative
        return None


    class Meta:
        model = Field
        fields = ['field_id', 'short_name','name',  'description', 'orientation', 'svg_map_url', 'background_image_url']


# FIELD + NESTED RAWS
class FieldLocationSerializer(serializers.ModelSerializer):
    field = serializers.SerializerMethodField()
    rows = RowSerializer(many=True, read_only=True)

    def get_field(self, obj):
        return FieldSerializer(obj).data

    class Meta:
        model = Field
        fields = ['field', 'rows']

 



class ImageSerializer(serializers.ModelSerializer):
    image_id = serializers.IntegerField(source='id', read_only=True)
    row_id = serializers.IntegerField(source='row.id', read_only=True)
    field_id = serializers.IntegerField(source='row.field.id', read_only=True)
    fruit_type = serializers.CharField(source='row.fruit.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    status = serializers.CharField(source='get_status_display', read_only=True)  # 🧠 This is the key line
    xy_location =  serializers.CharField(  read_only=True)
    user_fruit_plant = serializers.FloatField(read_only=True)
    date = serializers.DateField(read_only=True, format="%Y-%m-%d")
    upload_date = serializers.DateField(read_only=True, format="%Y-%m-%d")
    processed_at = serializers.DateTimeField(read_only=True, format="%Y-%m-%dT%H:%M:%S")
    original_filename = serializers.CharField(read_only=True)
    
    def get_image_url(self, obj):
        if obj.image_file:
            return obj.image_file.url  # ✅ Always relative
        return None


    class Meta:
        model = Image
        fields = [
            'image_id', 'row_id', 'field_id', 'xy_location', 'fruit_type','user_fruit_plant',
            'upload_date', 'date', 'image_url', 'original_filename',
            'processed', 'processed_at', 'status'
        ]




# UPLOAD IMAGE
class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
    row_id = serializers.IntegerField()
    date = serializers.DateField()
    xy_location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    user_fruit_plant = serializers.FloatField(required=False)



# ESTIMATION (History)
class EstimationSerializer(serializers.ModelSerializer):
    estimation_id = serializers.IntegerField(source='id', read_only=True)
    row_id = serializers.IntegerField(source='row.id', read_only=True)
    row_name = serializers.CharField(source='row.name', read_only=True)
    field_id = serializers.IntegerField(source='row.field.id', read_only=True)
    field_name = serializers.CharField(source='row.field.name', read_only=True)
    fruit_type = serializers.CharField(source='row.fruit.name', read_only=True)
    image_id = serializers.IntegerField(source='image.id', read_only=True)
    confidence_score = serializers.FloatField()
    fruit_plant = serializers.FloatField()
    source = serializers.CharField(source='get_source_display', read_only=True)
    status = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(read_only=True, format="%Y-%m-%dT%H:%M:%S")


    def get_status(self, obj):
        if obj.image and getattr(obj.image, 'status', None):
            return obj.image.status
        return "unknown"

    class Meta:
        model = Estimation
        fields = [
            'estimation_id', 'image_id', 'date', 'timestamp',
            'row_id', 'row_name', 'field_id', 'field_name', 'fruit_type',
            'plant_kg', 'row_kg', 
            'maturation_grade', 'confidence_score', 'source',  'fruit_plant', 'confidence_score','status'
        ]



# ML Status (Simplified)
class MLStatusSerializer(serializers.ModelSerializer):
    image_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = Image
        fields = ['image_id',   'processed']

 